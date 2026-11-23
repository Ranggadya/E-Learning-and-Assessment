import assert from "node:assert/strict";
import test from "node:test";
import type { ExistingQuestionSnapshot, SubtestSnapshot } from "@/types/admin";
import {
  compareContainerMetadata,
  compareExplanationSubtest,
  compareSubtestContent,
  computeCanonicalHash,
  extractParsedMetadata,
  hasDetailedExplanation,
  normalizePromptText,
  parsePgInt4Id,
  resolveAuditActionType,
  sanitizeImportFileName,
  validatePackageUpdateInput,
  validateSubtestUpdateInput,
} from "./import-analysis";

function makeQuestion(overrides: Partial<ExistingQuestionSnapshot> = {}): ExistingQuestionSnapshot {
  return {
    orderIndex: 1,
    type: "TEXT",
    prompt: "Berapakah 2 + 2?",
    imageSvg: null,
    options: ["3", "4", "5", "6"],
    correctIndex: 1,
    explanation: "2 ditambah 2 sama dengan 4.",
    steps: null,
    wrongNotes: null,
    quickTip: null,
    ...overrides,
  };
}

function makeSubtest(overrides: Partial<SubtestSnapshot> = {}): SubtestSnapshot {
  return {
    name: "Numerik Dasar",
    description: null,
    durationSeconds: 600,
    kind: "QUIZ",
    config: null,
    questions: [makeQuestion()],
    ...overrides,
  };
}

test("computeCanonicalHash stabil terhadap urutan key dan mengabaikan undefined, namun sensitif terhadap perubahan nilai dan urutan array", () => {
  const hashA = computeCanonicalHash({ b: 2, a: { d: 4, c: 3 } });
  const hashB = computeCanonicalHash({ a: { c: 3, d: 4 }, b: 2 });
  assert.equal(hashA.length, 64);
  assert.match(hashA, /^[0-9a-f]{64}$/);
  assert.equal(hashA, hashB);

  assert.equal(
    computeCanonicalHash({ a: 1, b: undefined }),
    computeCanonicalHash({ a: 1 }),
  );

  assert.notEqual(
    computeCanonicalHash({ items: [1, 2, 3] }),
    computeCanonicalHash({ items: [1, 3, 2] }),
  );
  assert.notEqual(
    computeCanonicalHash({ a: 1 }),
    computeCanonicalHash({ a: 2 }),
  );
});

test("hasDetailedExplanation mengecek isi bermakna pada steps, wrongNotes, atau quickTip", () => {
  assert.equal(hasDetailedExplanation({ steps: null, wrongNotes: null, quickTip: null }), false);
  assert.equal(hasDetailedExplanation({ steps: [], wrongNotes: ["", "  "], quickTip: "  " }), false);
  assert.equal(hasDetailedExplanation({ steps: ["Langkah 1"], wrongNotes: null, quickTip: null }), true);
  assert.equal(hasDetailedExplanation({ steps: null, wrongNotes: ["", "Salah hitung"], quickTip: null }), true);
  assert.equal(hasDetailedExplanation({ steps: null, wrongNotes: null, quickTip: "Cek satuan" }), true);
});

test("compareSubtestContent mendeteksi subtes identik, penurunan pembahasan detail, dan perubahan config non-QUIZ", () => {
  const qDetailed = makeQuestion({
    steps: ["Jumlahkan 2 dan 2"],
    wrongNotes: ["Kurang 1", "", "Kelebihan 1", "Kelebihan 2"],
    quickTip: "Hafalkan penjumlahan dasar",
  });
  const existingQuiz = makeSubtest({ questions: [qDetailed] });
  const incomingSameQuiz = makeSubtest({ questions: [{ ...qDetailed }] });

  const sameRes = compareSubtestContent(existingQuiz, incomingSameQuiz);
  assert.equal(sameRes.changeType, "identik");
  assert.equal(sameRes.changedQuestionCount, 0);
  assert.equal(sameRes.losesDetailedExplanations, false);

  const incomingDroppedDetails = makeSubtest({
    questions: [makeQuestion({ steps: null, wrongNotes: null, quickTip: null })],
  });
  const droppedRes = compareSubtestContent(existingQuiz, incomingDroppedDetails);
  assert.equal(droppedRes.changeType, "berubah");
  assert.equal(droppedRes.existingDetailedCount, 1);
  assert.equal(droppedRes.incomingDetailedCount, 0);
  assert.equal(droppedRes.losesDetailedExplanations, true);

  const existingPauli = makeSubtest({
    name: "Pauli",
    kind: "PAULI",
    durationSeconds: 300,
    config: { columns: 10, digitsPerColumn: 20, secondsPerColumn: 30 },
    questions: [],
  });
  const incomingPauliSame = makeSubtest({
    name: "Pauli",
    kind: "PAULI",
    durationSeconds: 300,
    config: { secondsPerColumn: 30, columns: 10, digitsPerColumn: 20 },
    questions: [],
  });
  const pauliSameRes = compareSubtestContent(existingPauli, incomingPauliSame);
  assert.equal(pauliSameRes.changeType, "identik");

  const incomingPauliChanged = makeSubtest({
    name: "Pauli",
    kind: "PAULI",
    durationSeconds: 360,
    config: { columns: 12, digitsPerColumn: 20, secondsPerColumn: 30 },
    questions: [],
  });
  const pauliChangedRes = compareSubtestContent(existingPauli, incomingPauliChanged);
  assert.equal(pauliChangedRes.changeType, "berubah");
  assert.equal(pauliChangedRes.losesDetailedExplanations, false);
});

test("compareContainerMetadata mengabaikan description undefined dan memberi warning dengan nilai lama dan baru saat berubah", () => {
  const unchanged = compareContainerMetadata(
    "Perusahaan",
    { name: "PT Astra", description: "Deskripsi lama" },
    { name: "PT Astra" },
  );
  assert.equal(unchanged.changed, false);
  assert.deepEqual(unchanged.warnings, []);

  const changedBoth = compareContainerMetadata(
    "Paket",
    { name: "Paket Lama", description: "Deskripsi lama" },
    { name: "Paket Baru", description: "Deskripsi baru" },
  );
  assert.equal(changedBoth.changed, true);
  assert.equal(changedBoth.warnings.length, 2);
  assert.ok(changedBoth.warnings[0].includes("Paket Lama") && changedBoth.warnings[0].includes("Paket Baru"));
  assert.ok(changedBoth.warnings[1].includes("Deskripsi lama") && changedBoth.warnings[1].includes("Deskripsi baru"));
});

test("compareExplanationSubtest menangani legacy entry, identik COALESCE, overwrite, prompt check, dan batas 3 spotChecks", () => {
  const q1 = makeQuestion({ orderIndex: 1, prompt: "Soal satu   dengan spasi", correctIndex: 1 });
  const q2 = makeQuestion({ orderIndex: 2, prompt: "Soal dua", correctIndex: 0 });
  const q3 = makeQuestion({ orderIndex: 3, prompt: "Soal tiga", correctIndex: 2 });
  const q4 = makeQuestion({ orderIndex: 4, prompt: "Soal empat", correctIndex: 3 });

  // 1. Legacy entry tanpa prompt pada soal tanpa pembahasan detail -> baru
  const baruRes = compareExplanationSubtest(
    "numerik",
    "Numerik",
    [q1, q2, q3, q4],
    [
      { number: 1, correctIndex: 1, steps: ["Langkah A"], quickTip: "Tip A" },
      { number: 2, correctIndex: 0, steps: ["Langkah B"] },
      { number: 3, correctIndex: 2, explanation: "Penjelasan baru C" },
      { number: 4, correctIndex: 3, wrongNotes: ["Salah 1", "Salah 2", "Salah 3", ""] },
    ],
  );
  assert.equal(baruRes.changeType, "baru");
  assert.equal(baruRes.existingDetailedOverwriteCount, 0);
  assert.equal(baruRes.coverageMismatch, false);
  assert.deepEqual(baruRes.promptMismatchErrors, []);
  assert.equal(baruRes.spotChecks.length, 3);
  assert.equal(baruRes.spotChecks[0].correctOption, "B");
  assert.equal(baruRes.spotChecks[0].dbPromptSnippet, "Soal satu dengan spasi");
  assert.equal(baruRes.spotChecks[0].incomingSnippet, "Langkah A");
  assert.equal(baruRes.spotChecks[0].alreadyHasDetailed, false);

  // 2. Entry identik dengan pembahasan detail yang sudah ada di DB -> identik
  const qDetailed = makeQuestion({
    orderIndex: 1,
    steps: ["Langkah 1"],
    wrongNotes: ["Salah", "", "Salah", "Salah"],
    quickTip: "Tip 1",
  });
  const identikRes = compareExplanationSubtest(
    "numerik",
    "Numerik",
    [qDetailed],
    [
      {
        number: 1,
        correctIndex: 1,
        steps: ["Langkah 1"],
        wrongNotes: ["Salah", "", "Salah", "Salah"],
        quickTip: "Tip 1",
      },
    ],
  );
  assert.equal(identikRes.changeType, "identik");
  assert.equal(identikRes.existingDetailedOverwriteCount, 0);

  // 3. Overwrite pembahasan detail + jumlah entry kurang -> berubah, overwriteCount 1, coverageMismatch true
  const overwriteRes = compareExplanationSubtest(
    "numerik",
    "Numerik",
    [qDetailed, q2],
    [{ number: 1, correctIndex: 1, quickTip: "Tip baru" }],
  );
  assert.equal(overwriteRes.changeType, "berubah");
  assert.equal(overwriteRes.existingDetailedOverwriteCount, 1);
  assert.equal(overwriteRes.coverageMismatch, true);
  assert.equal(overwriteRes.spotChecks[0].alreadyHasDetailed, true);

  // 4. Optional prompt cocok setelah normalisasi spasi vs berbeda kata
  assert.equal(normalizePromptText("  Halo\n  dunia\t! "), "Halo dunia !");
  const promptCheck = compareExplanationSubtest(
    "numerik",
    "Numerik",
    [q1, q2],
    [
      { number: 1, correctIndex: 1, prompt: "  Soal satu\ndengan   spasi  ", quickTip: "Ok" },
      { number: 2, correctIndex: 0, prompt: "Soal berbeda total", quickTip: "Mismatch" },
    ],
  );
  assert.equal(promptCheck.promptMismatchErrors.length, 1);
  assert.ok(promptCheck.promptMismatchErrors[0].includes("2"));
});

test("validatePackageUpdateInput dan validateSubtestUpdateInput memvalidasi batas input dan aturan SubtestKind", () => {
  assert.deepEqual(
    validatePackageUpdateInput({ name: "  Paket Hemat  ", description: "   " }),
    { ok: true, data: { name: "Paket Hemat", description: null } },
  );
  assert.equal(validatePackageUpdateInput({ name: "   ", description: null }).ok, false);
  assert.equal(validatePackageUpdateInput({ name: "a".repeat(161) }).ok, false);
  assert.equal(validatePackageUpdateInput({ name: "Ok", description: "a".repeat(1001) }).ok, false);
  assert.equal(validatePackageUpdateInput({ name: "Ok", description: 123 }).ok, false);

  assert.deepEqual(
    validateSubtestUpdateInput({ name: "  Verbal  ", durationSeconds: 600 }, "QUIZ", 300),
    { ok: true, data: { name: "Verbal", durationSeconds: 600 } },
  );
  assert.deepEqual(
    validateSubtestUpdateInput({ name: "Kepribadian", durationSeconds: 10 }, "PERSONALITY", 900),
    { ok: true, data: { name: "Kepribadian", durationSeconds: 10 } },
  );
  assert.equal(validateSubtestUpdateInput({ name: "Verbal", durationSeconds: 9 }, "QUIZ", 300).ok, false);
  assert.equal(validateSubtestUpdateInput({ name: "Verbal", durationSeconds: 10801 }, "QUIZ", 300).ok, false);
  assert.equal(validateSubtestUpdateInput({ name: "Verbal", durationSeconds: 120.5 }, "QUIZ", 300).ok, false);
  assert.equal(validateSubtestUpdateInput({ name: "Verbal" }, "QUIZ", 300).ok, false);

  assert.deepEqual(
    validateSubtestUpdateInput({ name: "Pauli Baru" }, "PAULI", 300),
    { ok: true, data: { name: "Pauli Baru", durationSeconds: 300 } },
  );
  assert.deepEqual(
    validateSubtestUpdateInput({ name: "Menggambar Baru", durationSeconds: 600 }, "DRAWING", 600),
    { ok: true, data: { name: "Menggambar Baru", durationSeconds: 600 } },
  );
  const pauliMismatch = validateSubtestUpdateInput({ name: "Pauli Baru", durationSeconds: 400 }, "PAULI", 300);
  assert.equal(pauliMismatch.ok, false);
  if (!pauliMismatch.ok) {
    assert.match(pauliMismatch.error, /JSON/i);
  }
});

test("sanitizeImportFileName membersihkan separator path, karakter kontrol, kosong, dan membatasi 180 karakter", () => {
  assert.equal(sanitizeImportFileName(null), null);
  assert.equal(sanitizeImportFileName(undefined), null);
  assert.equal(sanitizeImportFileName("   \n\t "), null);
  assert.equal(sanitizeImportFileName("///\\\\"), null);
  assert.equal(sanitizeImportFileName("folder/sub\\paket\x00-1.json"), "foldersubpaket-1.json");
  const longName = "a".repeat(200) + ".json";
  assert.equal(sanitizeImportFileName(longName)?.length, 180);
});

test("parsePgInt4Id, extractParsedMetadata, dan resolveAuditActionType memvalidasi batas ID dan klasifikasi log", () => {
  assert.equal(parsePgInt4Id("1"), 1);
  assert.equal(parsePgInt4Id("2147483647"), 2_147_483_647);
  assert.equal(parsePgInt4Id("0"), null);
  assert.equal(parsePgInt4Id("-5"), null);
  assert.equal(parsePgInt4Id("2147483648"), null);
  assert.equal(parsePgInt4Id("abc"), null);

  const meta = extractParsedMetadata({
    company: { slug: " astra ", name: " PT Astra " },
    package: { slug: " paket-1 ", name: " Paket 1 " },
  });
  assert.equal(meta.companySlug, "astra");
  assert.equal(meta.packageSlug, "paket-1");
  assert.equal(meta.targetLabel, "PT Astra / Paket 1");
  assert.equal(meta.contentHash.length, 64);

  assert.equal(resolveAuditActionType({ isDuplicateContent: false, hasOverwrite: false }), "PACK_NEW");
  assert.equal(resolveAuditActionType({ isDuplicateContent: false, hasOverwrite: true }), "PACK_OVERWRITE");
  assert.equal(resolveAuditActionType({ isDuplicateContent: true, hasOverwrite: false }), "PACK_DUPLICATE_FORCED");
  assert.equal(
    resolveAuditActionType({ mode: "pembahasan", isDuplicateContent: false, hasOverwrite: false }),
    "EXPLANATION_NEW",
  );
  assert.equal(
    resolveAuditActionType({ mode: "pembahasan", isDuplicateContent: false, hasOverwrite: true }),
    "EXPLANATION_OVERWRITE",
  );
  assert.equal(
    resolveAuditActionType({ mode: "pembahasan", isDuplicateContent: true, hasOverwrite: true }),
    "EXPLANATION_DUPLICATE_FORCED",
  );
});
