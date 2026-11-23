import assert from "node:assert/strict";
import test from "node:test";
import type { ExplanationPackFile, ImportDbClient, PackFile } from "@/types/admin";
import { importExplanations } from "./explanation-pack";
import { ImportConfirmationRequiredError, importPack } from "./pack-import";

interface LoggedQuery {
  text: string;
  values?: unknown[];
}

function makeFakeClient(
  handler: (sql: string, values?: unknown[]) => unknown[],
): { client: ImportDbClient; queries: LoggedQuery[]; released: () => boolean } {
  const queries: LoggedQuery[] = [];
  let isReleased = false;
  const client: ImportDbClient = {
    async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
      queries.push({ text: text.replace(/\s+/g, " ").trim(), values });
      return { rows: handler(text, values) as T[] };
    },
    release() {
      isReleased = true;
    },
  };
  return { client, queries, released: () => isReleased };
}

function makePack(overrides: Partial<PackFile> = {}): PackFile {
  return {
    company: { slug: "paragon", name: "Paragon" },
    package: { slug: "paket-1", name: "Paket 1", description: "   " },
    subtests: [
      {
        slug: "verbal",
        name: "Verbal",
        durationSeconds: 600,
        questions: [
          {
            type: "TEXT",
            prompt: "Antonim HEMAT?",
            options: ["boros", "kikir"],
            correctIndex: 0,
            explanation: "Lawan hemat adalah boros.",
          },
        ],
      },
      {
        slug: "numerik",
        name: "Numerik",
        durationSeconds: 900,
        questions: [
          {
            type: "TEXT",
            prompt: "2 + 3 = ?",
            options: ["4", "5"],
            correctIndex: 1,
            explanation: "2 + 3 = 5.",
          },
        ],
      },
    ],
    ...overrides,
  };
}

function makeExistingPackHandler() {
  return (sql: string, values?: unknown[]) => {
    if (sql.includes("FROM companies WHERE slug")) {
      return [{ id: 1, name: "Paragon", description: "Deskripsi perusahaan lama" }];
    }
    if (sql.includes("FROM test_packages WHERE company_id")) {
      return [{ id: 10, name: "Paket 1", description: null }];
    }
    if (sql.includes("MAX(order_index)")) {
      return [{ max_order: 2 }];
    }
    if (sql.includes("FROM subtests WHERE test_package_id")) {
      const slug = values?.[1];
      if (slug === "verbal") {
        return [{ id: 101, name: "Verbal", description: null, duration_seconds: 600, kind: "QUIZ", config: null }];
      }
      if (slug === "numerik") {
        return [{ id: 102, name: "Numerik", description: null, duration_seconds: 900, kind: "QUIZ", config: null }];
      }
      return [];
    }
    if (sql.includes("FROM questions") && sql.includes("WHERE subtest_id = $1")) {
      const subtestId = values?.[0];
      if (subtestId === 101) {
        // Identik dengan makePack().subtests[0]
        return [
          {
            id: 1001,
            order_index: 1,
            type: "TEXT",
            prompt: "Antonim HEMAT?",
            image_svg: null,
            options: [{ key: "A", label: "boros" }, { key: "B", label: "kikir" }],
            correct_option: "A",
            explanation: "Lawan hemat adalah boros.",
            steps: null,
            wrong_notes: null,
            quick_tip: null,
          },
        ];
      }
      // Berbeda dari makePack().subtests[1] dan punya pembahasan rinci
      return [
        {
          id: 1002,
          order_index: 1,
          type: "TEXT",
          prompt: "1 + 1 = ?",
          image_svg: null,
          options: [{ key: "A", label: "2" }, { key: "B", label: "3" }],
          correct_option: "A",
          explanation: "1 + 1 = 2.",
          steps: ["Tambahkan 1 dengan 1."],
          wrong_notes: null,
          quick_tip: "Penjumlahan dasar.",
        },
      ];
    }
    if (sql.includes("COUNT(*) AS total FROM attempts")) {
      return [{ total: "7" }];
    }
    if (sql.includes("INSERT INTO companies")) {
      return [{ id: 1 }];
    }
    if (sql.includes("INSERT INTO test_packages")) {
      return [{ id: 10 }];
    }
    if (sql.includes("MAX(order_index)")) {
      return [{ max_order: 2 }];
    }
    return [];
  };
}

test("importPack dryRun tidak membuka transaksi atau menjalankan query tulis sama sekali", async () => {
  const { client, queries, released } = makeFakeClient(makeExistingPackHandler());
  const summary = await importPack(makePack(), {
    dryRun: true,
    connectClient: async () => client,
    findPreviousUpload: async () => null,
  });

  assert.equal(summary.dryRun, true);
  assert.equal(summary.requiresConfirmation, true);
  assert.equal(summary.subtests[0].changeType, "identik");
  assert.equal(summary.subtests[1].changeType, "berubah");
  assert.equal(summary.subtests[1].losesDetailedExplanations, true);
  assert.equal(summary.subtests[1].replacedAttemptCount, 7);
  assert.equal(
    queries.some((q) => /^(BEGIN|COMMIT|ROLLBACK|INSERT|UPDATE|DELETE)\b/i.test(q.text)),
    false,
    `Dry-run tidak boleh menjalankan tulis/transaksi: ${queries.map((q) => q.text).join(" | ")}`,
  );
  assert.equal(released(), true);
});

test("importPack tanpa force melempar ImportConfirmationRequiredError sebelum ada query tulis", async () => {
  const { client, queries, released } = makeFakeClient(makeExistingPackHandler());
  await assert.rejects(
    () =>
      importPack(makePack(), {
        dryRun: false,
        force: false,
        connectClient: async () => client,
        findPreviousUpload: async () => null,
      }),
    (err: unknown) => {
      assert.ok(err instanceof ImportConfirmationRequiredError);
      assert.equal(err.summary.requiresConfirmation, true);
      return true;
    },
  );

  assert.equal(
    queries.some((q) => /^(BEGIN|COMMIT|INSERT|UPDATE|DELETE)\b/i.test(q.text)),
    false,
  );
  assert.equal(released(), true);
});

test("importPack dengan force=true melewati subtes identik, memakai batch UNNEST, dan menormalkan description", async () => {
  const { client, queries, released } = makeFakeClient(makeExistingPackHandler());
  const summary = await importPack(makePack(), {
    dryRun: false,
    force: true,
    connectClient: async () => client,
    findPreviousUpload: async () => null,
  });

  assert.equal(summary.subtests[0].changeType, "identik");
  assert.equal(summary.subtests[1].changeType, "berubah");

  // Company description undefined -> flag $4 harus false agar deskripsi DB tidak tertimpa NULL
  const companyUpsert = queries.find((q) => q.text.startsWith("INSERT INTO companies"));
  assert.ok(companyUpsert);
  assert.equal(companyUpsert.values?.[3], false);

  // Package description "   " -> dinormalkan menjadi null (bukan spasi mentah)
  const packageUpsert = queries.find((q) => q.text.startsWith("INSERT INTO test_packages"));
  assert.ok(packageUpsert);
  assert.equal(packageUpsert.values?.[3], null);

  // Subtes 101 (identik) tidak boleh dihapus/ditulis ulang; hanya 102 (berubah) yang ditulis via UNNEST
  const deletes = queries.filter((q) => q.text.startsWith("DELETE FROM questions"));
  assert.equal(deletes.length, 1);
  assert.deepEqual(deletes[0].values, [102]);

  const batchInserts = queries.filter((q) => q.text.startsWith("INSERT INTO questions"));
  assert.equal(batchInserts.length, 1);
  assert.ok(batchInserts[0].text.includes("FROM UNNEST("));
  assert.equal(batchInserts[0].values?.[0], 102);

  assert.ok(queries.some((q) => q.text === "BEGIN"));
  assert.ok(queries.some((q) => q.text === "COMMIT"));
  assert.equal(released(), true);
});

test("importExplanations menolak 409 tanpa tulis dan melakukan 1 batch UNNEST UPDATE saat force=true sambil melewati subtes identik", async () => {
  const explanationPack: ExplanationPackFile = {
    pembahasanSaja: true,
    company: { slug: "paragon" },
    package: { slug: "paket-1" },
    subtests: [
      {
        slug: "verbal",
        explanations: [
          {
            number: 1,
            correctIndex: 0,
            explanation: "Lawan hemat adalah boros.",
          },
        ],
      },
      {
        slug: "numerik",
        explanations: [
          {
            number: 1,
            correctIndex: 0,
            steps: ["Langkah terbaru."],
            quickTip: "Tip baru.",
          },
        ],
      },
    ],
  };

  const handler = (sql: string, values?: unknown[]) => {
    if (sql.includes("FROM test_packages p JOIN companies c")) {
      return [{ id: 10, name: "Paket 1", company_name: "Paragon" }];
    }
    return makeExistingPackHandler()(sql, values);
  };

  const first = makeFakeClient(handler);
  await assert.rejects(
    () =>
      importExplanations(explanationPack, {
        dryRun: false,
        force: false,
        connectClient: async () => first.client,
        findPreviousUpload: async () => null,
      }),
    ImportConfirmationRequiredError,
  );
  assert.equal(
    first.queries.some((q) => /^(BEGIN|UPDATE|COMMIT)\b/i.test(q.text)),
    false,
  );

  const forced = makeFakeClient(handler);
  const summary = await importExplanations(explanationPack, {
    dryRun: false,
    force: true,
    connectClient: async () => forced.client,
    findPreviousUpload: async () => null,
  });

  assert.equal(summary.subtests[0].changeType, "identik");
  assert.equal(summary.subtests[1].changeType, "berubah");
  const updates = forced.queries.filter((q) => q.text.startsWith("UPDATE questions"));
  assert.equal(updates.length, 1);
  assert.ok(updates[0].text.includes("FROM UNNEST("));
  // Hanya questionId 1002 (numerik) yang di-update; 1001 (verbal identik) dilewati
  assert.deepEqual(updates[0].values?.[0], [1002]);
  assert.ok(forced.queries.some((q) => q.text === "COMMIT"));
  assert.equal(forced.released(), true);
});

test("importExplanations hanya meng-update butir soal yang berubah dalam subtes yang sama dan menghitung changedQuestionCount akurat", async () => {
  const explanationPack: ExplanationPackFile = {
    pembahasanSaja: true,
    company: { slug: "paragon" },
    package: { slug: "paket-1" },
    subtests: [
      {
        slug: "numerik",
        explanations: [
          { number: 1, correctIndex: 0, explanation: "1 + 1 = 2." },
          { number: 2, correctIndex: 1, explanation: "2 + 3 = 5.", quickTip: "Tip baru soal 2." },
        ],
      },
    ],
  };

  const handler = (sql: string) => {
    if (sql.includes("FROM test_packages p JOIN companies c")) {
      return [{ id: 10, name: "Paket 1", company_name: "Paragon" }];
    }
    if (sql.includes("FROM subtests WHERE test_package_id")) {
      return [{ id: 102, name: "Numerik", description: null, duration_seconds: 900, kind: "QUIZ", config: null }];
    }
    if (sql.includes("FROM questions")) {
      return [
        {
          id: 2001,
          order_index: 1,
          type: "TEXT",
          prompt: "1 + 1 = ?",
          image_svg: null,
          options: [{ key: "A", label: "2" }, { key: "B", label: "3" }],
          correct_option: "A",
          explanation: "1 + 1 = 2.",
          steps: null,
          wrong_notes: null,
          quick_tip: null,
        },
        {
          id: 2002,
          order_index: 2,
          type: "TEXT",
          prompt: "2 + 3 = ?",
          image_svg: null,
          options: [{ key: "A", label: "4" }, { key: "B", label: "5" }],
          correct_option: "B",
          explanation: "2 + 3 = 5.",
          steps: null,
          wrong_notes: null,
          quick_tip: null,
        },
      ];
    }
    return [];
  };

  const fake = makeFakeClient(handler);
  const summary = await importExplanations(explanationPack, {
    dryRun: false,
    force: false,
    connectClient: async () => fake.client,
    findPreviousUpload: async () => null,
  });

  // Soal #1 identik, hanya Soal #2 (id 2002) yang berubah
  assert.equal(summary.subtests[0].changedQuestionCount, 1);
  const updates = fake.queries.filter((q) => q.text.startsWith("UPDATE questions"));
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].values?.[0], [2002]);
});
