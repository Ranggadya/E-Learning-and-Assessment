import { OPTION_KEYS } from "@/lib/assessment/constants";
import { countSubtestItems } from "@/lib/assessment/scoring";
import { databasePool } from "@/lib/db/pool";
import type {
  AdminCompany,
  DeletedPackageMeta,
  DeletedSubtestMeta,
  ExportedPack,
  UpdatedPackageResult,
  UpdatedSubtestResult,
} from "@/types/admin";
import type { QuestionOption, QuestionType, SubtestKind } from "@/types/assessment";

export async function getAdminOverview(): Promise<AdminCompany[]> {
  const result = await databasePool.query<{
    company_id: number;
    company_slug: string;
    company_name: string;
    package_id: number | null;
    package_slug: string | null;
    package_name: string | null;
    package_description: string | null;
    subtest_id: number | null;
    subtest_slug: string | null;
    subtest_name: string | null;
    duration_seconds: number | null;
    subtest_kind: string | null;
    subtest_config: unknown | null;
    question_count: string | null;
    detailed_explanation_count: string | null;
  }>(
    `SELECT c.id AS company_id, c.slug AS company_slug, c.name AS company_name,
            p.id AS package_id, p.slug AS package_slug, p.name AS package_name, p.description AS package_description,
            s.id AS subtest_id, s.slug AS subtest_slug, s.name AS subtest_name, s.duration_seconds,
            s.kind AS subtest_kind, s.config AS subtest_config,
            (SELECT COUNT(*) FROM questions q WHERE q.subtest_id = s.id) AS question_count,
            CASE WHEN s.kind = 'QUIZ' THEN (
              SELECT COUNT(*) FROM questions q
              WHERE q.subtest_id = s.id
                AND (
                  (jsonb_typeof(q.steps) = 'array' AND jsonb_array_length(q.steps) > 0)
                  OR (jsonb_typeof(q.wrong_notes) = 'array' AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(q.wrong_notes) AS note WHERE btrim(note) <> ''
                  ))
                  OR (q.quick_tip IS NOT NULL AND btrim(q.quick_tip) <> '')
                )
            ) ELSE 0 END AS detailed_explanation_count
     FROM companies c
     LEFT JOIN test_packages p ON p.company_id = c.id
     LEFT JOIN subtests s ON s.test_package_id = p.id
     ORDER BY c.name, p.name, s.order_index`,
  );

  const companies: AdminCompany[] = [];
  for (const row of result.rows) {
    let company = companies.find(function findCompany(candidate) {
      return candidate.id === row.company_id;
    });
    if (!company) {
      company = { id: row.company_id, slug: row.company_slug, name: row.company_name, packages: [] };
      companies.push(company);
    }
    if (row.package_id === null || row.package_slug === null || row.package_name === null) {
      continue;
    }
    const packageId = row.package_id;
    let testPackage = company.packages.find(function findPackage(candidate) {
      return candidate.id === packageId;
    });
    if (!testPackage) {
      testPackage = {
        id: packageId,
        slug: row.package_slug,
        name: row.package_name,
        description: row.package_description ?? null,
        subtests: [],
      };
      company.packages.push(testPackage);
    }
    if (row.subtest_id !== null && row.subtest_slug !== null && row.subtest_name !== null) {
      const kind = (row.subtest_kind as SubtestKind) ?? "QUIZ";
      testPackage.subtests.push({
        id: row.subtest_id,
        slug: row.subtest_slug,
        name: row.subtest_name,
        durationSeconds: row.duration_seconds ?? 0,
        questionCount: countSubtestItems(kind, Number(row.question_count ?? 0), row.subtest_config),
        detailedExplanationCount: kind === "QUIZ" ? Number(row.detailed_explanation_count ?? 0) : 0,
        kind,
        config: row.subtest_config ?? null,
      });
    }
  }
  return companies;
}

export async function updatePackageMetadata(
  packageId: number,
  input: { name: string; description: string | null },
): Promise<UpdatedPackageResult | null> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{
      company_slug: string;
      package_slug: string;
      name: string;
      description: string | null;
    }>(
      `SELECT c.slug AS company_slug, p.slug AS package_slug, p.name, p.description
       FROM test_packages p
       JOIN companies c ON c.id = p.company_id
       WHERE p.id = $1
       FOR UPDATE`,
      [packageId],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const prev = existing.rows[0];
    await client.query(
      "UPDATE test_packages SET name = $2, description = $3 WHERE id = $1",
      [packageId, input.name, input.description],
    );
    await client.query("COMMIT");
    return {
      companySlug: prev.company_slug,
      packageSlug: prev.package_slug,
      before: { name: prev.name, description: prev.description ?? null },
      after: { name: input.name, description: input.description ?? null },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateSubtestMetadata(
  subtestId: number,
  validate: (kind: SubtestKind, currentDurationSeconds: number) =>
    | { ok: true; data: { name: string; durationSeconds: number } }
    | { ok: false; error: string },
): Promise<
  | { ok: true; updated: UpdatedSubtestResult }
  | { ok: false; status: 400 | 404; error: string }
> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{
      slug: string;
      name: string;
      duration_seconds: number;
      kind: string;
      company_slug: string;
      package_slug: string;
      package_name: string;
    }>(
      `SELECT s.slug, s.name, s.duration_seconds, s.kind,
              c.slug AS company_slug, p.slug AS package_slug, p.name AS package_name
       FROM subtests s
       JOIN test_packages p ON p.id = s.test_package_id
       JOIN companies c ON c.id = p.company_id
       WHERE s.id = $1
       FOR UPDATE OF s`,
      [subtestId],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, status: 404, error: "Subtes tidak ditemukan" };
    }
    const row = existing.rows[0];
    const kind: SubtestKind = (row.kind as SubtestKind) ?? "QUIZ";
    const validation = validate(kind, row.duration_seconds);
    if (!validation.ok) {
      await client.query("ROLLBACK");
      return { ok: false, status: 400, error: validation.error };
    }
    await client.query(
      "UPDATE subtests SET name = $2, duration_seconds = $3 WHERE id = $1",
      [subtestId, validation.data.name, validation.data.durationSeconds],
    );
    await client.query("COMMIT");
    return {
      ok: true,
      updated: {
        companySlug: row.company_slug,
        packageSlug: row.package_slug,
        packageName: row.package_name,
        subtestSlug: row.slug,
        kind,
        before: { name: row.name, durationSeconds: row.duration_seconds },
        after: validation.data,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Menghapus paket secara atomik; perusahaan tanpa paket tersisa ikut dihapus agar beranda tetap bersih.
export async function deletePackage(packageId: number): Promise<DeletedPackageMeta | null> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const deleted = await client.query<{
      company_id: number;
      company_slug: string;
      company_name: string;
      package_slug: string;
      package_name: string;
    }>(
      `DELETE FROM test_packages p
       USING companies c
       WHERE p.id = $1 AND c.id = p.company_id
       RETURNING p.company_id, c.slug AS company_slug, c.name AS company_name,
                 p.slug AS package_slug, p.name AS package_name`,
      [packageId],
    );
    if (deleted.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const meta = deleted.rows[0];
    await client.query(
      `DELETE FROM companies c WHERE c.id = $1
       AND NOT EXISTS (SELECT 1 FROM test_packages p WHERE p.company_id = c.id)`,
      [meta.company_id],
    );
    await client.query("COMMIT");
    return {
      companySlug: meta.company_slug,
      companyName: meta.company_name,
      packageSlug: meta.package_slug,
      packageName: meta.package_name,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteSubtest(subtestId: number): Promise<DeletedSubtestMeta | null> {
  const result = await databasePool.query<{
    company_slug: string;
    package_slug: string;
    package_name: string;
    subtest_slug: string;
    subtest_name: string;
  }>(
    `DELETE FROM subtests s
     USING test_packages p, companies c
     WHERE s.id = $1 AND p.id = s.test_package_id AND c.id = p.company_id
     RETURNING c.slug AS company_slug, p.slug AS package_slug, p.name AS package_name,
               s.slug AS subtest_slug, s.name AS subtest_name`,
    [subtestId],
  );
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0];
  return {
    companySlug: row.company_slug,
    packageSlug: row.package_slug,
    packageName: row.package_name,
    subtestSlug: row.subtest_slug,
    subtestName: row.subtest_name,
  };
}

// Ekspor memakai format yang sama dengan impor, sehingga hasil ekspor bisa diedit lalu diunggah ulang.
export async function exportPack(packageId: number): Promise<ExportedPack | null> {
  const packageResult = await databasePool.query<{
    company_slug: string;
    company_name: string;
    company_description: string | null;
    package_slug: string;
    package_name: string;
    package_description: string | null;
  }>(
    `SELECT c.slug AS company_slug, c.name AS company_name, c.description AS company_description,
            p.slug AS package_slug, p.name AS package_name, p.description AS package_description
     FROM test_packages p JOIN companies c ON c.id = p.company_id WHERE p.id = $1`,
    [packageId],
  );
  const packageRow = packageResult.rows[0];
  if (!packageRow) {
    return null;
  }

  const subtestResult = await databasePool.query<{
    id: number;
    slug: string;
    name: string;
    description: string | null;
    duration_seconds: number;
    kind: string | null;
    config: unknown | null;
  }>(
    "SELECT id, slug, name, description, duration_seconds, kind, config FROM subtests WHERE test_package_id = $1 ORDER BY order_index",
    [packageId],
  );

  const subtestIds = subtestResult.rows.map((row) => row.id);
  const questionsBySubtestId = new Map<
    number,
    Array<{
      type: QuestionType;
      prompt: string;
      image_svg: string | null;
      options: QuestionOption[];
      correct_option: string;
      explanation: string | null;
      steps: string[] | null;
      wrong_notes: string[] | null;
      quick_tip: string | null;
    }>
  >();

  if (subtestIds.length > 0) {
    const questionResult = await databasePool.query<{
      subtest_id: number;
      type: QuestionType;
      prompt: string;
      image_svg: string | null;
      options: QuestionOption[];
      correct_option: string;
      explanation: string | null;
      steps: string[] | null;
      wrong_notes: string[] | null;
      quick_tip: string | null;
    }>(
      `SELECT subtest_id, type, prompt, image_svg, options, correct_option, explanation, steps, wrong_notes, quick_tip
       FROM questions
       WHERE subtest_id = ANY($1::int[])
       ORDER BY subtest_id, order_index`,
      [subtestIds],
    );
    for (const row of questionResult.rows) {
      const list = questionsBySubtestId.get(row.subtest_id);
      if (list) {
        list.push(row);
      } else {
        questionsBySubtestId.set(row.subtest_id, [row]);
      }
    }
  }

  const subtests: ExportedPack["subtests"] = subtestResult.rows.map((subtestRow) => {
    const questions = questionsBySubtestId.get(subtestRow.id) ?? [];
    return {
      slug: subtestRow.slug,
      name: subtestRow.name,
      ...(subtestRow.description ? { description: subtestRow.description } : {}),
      durationSeconds: subtestRow.duration_seconds,
      ...(subtestRow.kind && subtestRow.kind !== "QUIZ" ? { kind: subtestRow.kind as SubtestKind } : {}),
      ...(subtestRow.config ? { config: subtestRow.config } : {}),
      ...(questions.length > 0
        ? {
            questions: questions.map(function mapExportedQuestion(row) {
              return {
                type: row.type,
                prompt: row.prompt,
                ...(row.image_svg ? { imageSvg: row.image_svg } : {}),
                options: row.options.map(function toLabel(option) {
                  return option.label;
                }),
                correctIndex: (OPTION_KEYS as readonly string[]).indexOf(row.correct_option),
                explanation: row.explanation ?? "",
                ...(row.steps ? { steps: row.steps } : {}),
                ...(row.wrong_notes ? { wrongNotes: row.wrong_notes } : {}),
                ...(row.quick_tip ? { quickTip: row.quick_tip } : {}),
              };
            }),
          }
        : {}),
    };
  });

  return {
    company: {
      slug: packageRow.company_slug,
      name: packageRow.company_name,
      ...(packageRow.company_description ? { description: packageRow.company_description } : {}),
    },
    package: {
      slug: packageRow.package_slug,
      name: packageRow.package_name,
      ...(packageRow.package_description ? { description: packageRow.package_description } : {}),
    },
    subtests,
  };
}
