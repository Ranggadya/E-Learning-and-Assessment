import { databasePool } from "./db";
import {
  countSubtestItems,
  scorePersonality,
  type AdminCompany,
  type AttemptResult,
  type Company,
  type DashboardCompany,
  type DrawingConfig,
  type DrawingResult,
  type NonQuizResult,
  type PauliConfig,
  type PauliResult,
  type PersonalityConfig,
  type PublicQuestion,
  type QuestionOption,
  type QuestionType,
  type ReviewItem,
  type Subtest,
  type SubtestKind,
  type SubtestLocation,
  type SubmitAttemptInput,
  type SubmitNonQuizInput,
  type TestPackage,
} from "./types";

const OPTION_KEYS = ["A", "B", "C", "D", "E"];
const VALID_TYPES = new Set<QuestionType>(["TEXT", "IMAGE", "MEMORY", "SPEED"]);

function normalizeQuestionTypes(raw: string[] | null | undefined): QuestionType[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<QuestionType>();
  for (const item of raw) {
    if (VALID_TYPES.has(item as QuestionType)) {
      seen.add(item as QuestionType);
    }
  }
  return Array.from(seen);
}

// ---------------------------------------------------------------- halaman publik

interface CompanyRow {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  package_count: string;
  subtest_ids: number[] | null;
}

export async function getCompanies(): Promise<Company[]> {
  const result = await databasePool.query<CompanyRow>(
    `SELECT c.id, c.slug, c.name, c.description,
            (SELECT COUNT(*) FROM test_packages p WHERE p.company_id = c.id) AS package_count,
            COALESCE((SELECT ARRAY_AGG(s.id) FROM subtests s JOIN test_packages p ON p.id = s.test_package_id WHERE p.company_id = c.id), ARRAY[]::int[]) AS subtest_ids
     FROM companies c ORDER BY c.name`,
  );
  return result.rows.map(function mapCompany(row) {
    const subtestIds = Array.isArray(row.subtest_ids) ? row.subtest_ids.map(Number) : [];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      packageCount: Number(row.package_count),
      subtestCount: subtestIds.length,
      subtestIds,
    };
  });
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const companies = await getCompanies();
  return (
    companies.find(function findCompany(company) {
      return company.slug === slug;
    }) ?? null
  );
}

export async function getDashboardCatalog(): Promise<DashboardCompany[]> {
  const result = await databasePool.query<{
    company_id: number;
    company_slug: string;
    company_name: string;
    company_description: string | null;
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
    question_types: string[] | null;
  }>(
    `SELECT c.id AS company_id, c.slug AS company_slug, c.name AS company_name, c.description AS company_description,
            p.id AS package_id, p.slug AS package_slug, p.name AS package_name, p.description AS package_description,
            s.id AS subtest_id, s.slug AS subtest_slug, s.name AS subtest_name, s.duration_seconds,
            s.kind AS subtest_kind, s.config AS subtest_config,
            (SELECT COUNT(*) FROM questions q WHERE q.subtest_id = s.id) AS question_count,
            (SELECT ARRAY_AGG(DISTINCT q.type) FROM questions q WHERE q.subtest_id = s.id) AS question_types
     FROM companies c
     LEFT JOIN test_packages p ON p.company_id = c.id
     LEFT JOIN subtests s ON s.test_package_id = p.id
     ORDER BY c.name, p.name, s.order_index`,
  );

  const companies: DashboardCompany[] = [];
  for (const row of result.rows) {
    let company = companies.find((item) => item.id === row.company_id);
    if (!company) {
      company = {
        id: row.company_id,
        slug: row.company_slug,
        name: row.company_name,
        description: row.company_description,
        packages: [],
      };
      companies.push(company);
    }
    if (row.package_id === null || row.package_slug === null || row.package_name === null) {
      continue;
    }
    let testPackage = company.packages.find((item) => item.id === row.package_id);
    if (!testPackage) {
      testPackage = {
        id: row.package_id,
        slug: row.package_slug,
        name: row.package_name,
        description: row.package_description,
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
        questionTypes: normalizeQuestionTypes(row.question_types),
        kind,
        config: row.subtest_config ?? null,
      });
    }
  }
  return companies;
}

interface PackageRow {
  id: number;
  company_id: number;
  slug: string;
  name: string;
  description: string | null;
  subtest_count: string;
  question_count: string;
}

function mapPackage(row: PackageRow): TestPackage {
  return {
    id: row.id,
    companyId: row.company_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    subtestCount: Number(row.subtest_count),
    questionCount: Number(row.question_count),
  };
}

const PACKAGE_SELECT = `
  SELECT p.id, p.company_id, p.slug, p.name, p.description,
         (SELECT COUNT(*) FROM subtests s WHERE s.test_package_id = p.id) AS subtest_count,
         (SELECT COUNT(*) FROM questions q JOIN subtests s ON s.id = q.subtest_id WHERE s.test_package_id = p.id) AS question_count
  FROM test_packages p
`;

export async function getPackagesByCompanyId(companyId: number): Promise<TestPackage[]> {
  const result = await databasePool.query<PackageRow>(
    `${PACKAGE_SELECT} WHERE p.company_id = $1 ORDER BY p.name`,
    [companyId],
  );
  return result.rows.map(mapPackage);
}

export async function getPackageBySlugs(companySlug: string, packageSlug: string): Promise<TestPackage | null> {
  const result = await databasePool.query<PackageRow>(
    `${PACKAGE_SELECT} JOIN companies c ON c.id = p.company_id WHERE c.slug = $1 AND p.slug = $2`,
    [companySlug, packageSlug],
  );
  return result.rows[0] ? mapPackage(result.rows[0]) : null;
}

interface SubtestRow {
  id: number;
  test_package_id: number;
  slug: string;
  name: string;
  description: string | null;
  duration_seconds: number;
  order_index: number;
  question_count: string;
  question_types: string[] | null;
  kind?: string | null;
  config?: unknown | null;
}

function mapSubtest(row: SubtestRow): Subtest {
  const kind = (row.kind as SubtestKind) ?? "QUIZ";
  return {
    id: row.id,
    testPackageId: row.test_package_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    durationSeconds: row.duration_seconds,
    orderIndex: row.order_index,
    questionCount: countSubtestItems(kind, Number(row.question_count), row.config),
    questionTypes: normalizeQuestionTypes(row.question_types),
    kind,
    config: row.config ?? null,
  };
}

export async function getSubtestsByPackageId(testPackageId: number): Promise<Subtest[]> {
  const result = await databasePool.query<SubtestRow>(
    `SELECT s.id, s.test_package_id, s.slug, s.name, s.description,
            s.duration_seconds, s.order_index, s.kind, s.config,
            (SELECT COUNT(*) FROM questions q WHERE q.subtest_id = s.id) AS question_count,
            (SELECT ARRAY_AGG(DISTINCT q.type) FROM questions q WHERE q.subtest_id = s.id) AS question_types
     FROM subtests s WHERE s.test_package_id = $1 ORDER BY s.order_index`,
    [testPackageId],
  );
  return result.rows.map(mapSubtest);
}

export async function getSubtestById(subtestId: number): Promise<SubtestLocation | null> {
  const result = await databasePool.query<
    SubtestRow & {
      company_slug: string;
      company_name: string;
      package_slug: string;
      package_name: string;
    }
  >(
    `SELECT s.id, s.test_package_id, s.slug, s.name, s.description,
            s.duration_seconds, s.order_index, s.kind, s.config,
            (SELECT COUNT(*) FROM questions q WHERE q.subtest_id = s.id) AS question_count,
            (SELECT ARRAY_AGG(DISTINCT q.type) FROM questions q WHERE q.subtest_id = s.id) AS question_types,
            p.slug AS package_slug, p.name AS package_name,
            c.slug AS company_slug, c.name AS company_name
     FROM subtests s
     JOIN test_packages p ON p.id = s.test_package_id
     JOIN companies c ON c.id = p.company_id
     WHERE s.id = $1`,
    [subtestId],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    ...mapSubtest(row),
    companySlug: row.company_slug,
    companyName: row.company_name,
    packageSlug: row.package_slug,
    packageName: row.package_name,
  };
}

interface QuestionRow {
  id: number;
  type: QuestionType;
  order_index: number;
  prompt: string;
  image_svg: string | null;
  options: QuestionOption[];
}

// Kunci jawaban sengaja tidak ikut dipilih agar tidak bocor ke browser peserta.
export async function getPublicQuestions(subtestId: number): Promise<PublicQuestion[]> {
  const result = await databasePool.query<QuestionRow>(
    `SELECT id, type, order_index, prompt, image_svg, options
     FROM questions WHERE subtest_id = $1 ORDER BY order_index`,
    [subtestId],
  );
  return result.rows.map(function mapQuestion(row) {
    return {
      id: row.id,
      type: row.type,
      orderIndex: row.order_index,
      prompt: row.prompt,
      imageSvg: row.image_svg,
      options: row.options,
    };
  });
}

// ---------------------------------------------------------------- pengerjaan dan hasil

interface AnswerKeyRow {
  id: number;
  correct_option: string;
}

// Menilai di server: kunci jawaban dibaca dari database, bukan dari klien.
export async function submitAttempt(input: SubmitAttemptInput): Promise<number> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");

    const answerKeyResult = await client.query<AnswerKeyRow>(
      "SELECT id, correct_option FROM questions WHERE subtest_id = $1",
      [input.subtestId],
    );
    const correctOptionByQuestionId = new Map<number, string>();
    for (const row of answerKeyResult.rows) {
      correctOptionByQuestionId.set(row.id, row.correct_option);
    }

    const selectedByQuestionId = new Map<number, string | null>();
    for (const answer of input.answers) {
      if (correctOptionByQuestionId.has(answer.questionId)) {
        selectedByQuestionId.set(answer.questionId, answer.selectedOption);
      }
    }

    const attemptResult = await client.query<{ id: number }>(
      "INSERT INTO attempts (subtest_id, total_questions) VALUES ($1, $2) RETURNING id",
      [input.subtestId, correctOptionByQuestionId.size],
    );
    const attemptId = attemptResult.rows[0].id;

    let score = 0;
    const questionIds: number[] = [];
    const selectedOptions: (string | null)[] = [];
    const isCorrectFlags: boolean[] = [];

    for (const [questionId, correctOption] of correctOptionByQuestionId) {
      const selectedOption = selectedByQuestionId.get(questionId) ?? null;
      const isCorrect = selectedOption !== null && selectedOption === correctOption;
      if (isCorrect) {
        score += 1;
      }
      questionIds.push(questionId);
      selectedOptions.push(selectedOption);
      isCorrectFlags.push(isCorrect);
    }

    if (questionIds.length > 0) {
      await client.query(
        `INSERT INTO answers (attempt_id, question_id, selected_option, is_correct)
         SELECT $1, * FROM UNNEST($2::int[], $3::text[], $4::bool[])`,
        [attemptId, questionIds, selectedOptions, isCorrectFlags],
      );
    }

    await client.query("UPDATE attempts SET score = $1, finished_at = now() WHERE id = $2", [score, attemptId]);
    await client.query("COMMIT");
    return attemptId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function submitNonQuizAttempt(input: SubmitNonQuizInput): Promise<number | null> {
  const subtestResult = await databasePool.query<{ kind: SubtestKind; config: unknown }>(
    "SELECT kind, config FROM subtests WHERE id = $1",
    [input.subtestId],
  );
  const subtestRow = subtestResult.rows[0];
  if (!subtestRow || subtestRow.kind !== input.kind) {
    return null;
  }

  let score = 0;
  let totalQuestions = 0;
  let resultPayload: NonQuizResult;

  if (input.kind === "PERSONALITY") {
    const scored = scorePersonality(subtestRow.config as PersonalityConfig, input.ratings);
    score = scored.answered;
    totalQuestions = scored.total;
    resultPayload = scored;
  } else if (input.kind === "PAULI") {
    const config = subtestRow.config as PauliConfig;
    const maxCols = typeof config?.columns === "number" ? config.columns : 10;
    const maxPairs = typeof config?.digitsPerColumn === "number" ? Math.max(1, config.digitsPerColumn - 1) : 100;
    const perColumn = input.perColumn.slice(0, maxCols).map((col, idx) => {
      const answered = Math.min(col.answered, maxPairs);
      const correct = Math.min(col.correct, answered);
      return { column: idx + 1, answered, correct };
    });
    const totalAnswered = perColumn.reduce((acc, col) => acc + col.answered, 0);
    const totalCorrect = perColumn.reduce((acc, col) => acc + col.correct, 0);
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    score = totalCorrect;
    totalQuestions = totalAnswered;
    resultPayload = {
      kind: "PAULI",
      totalAnswered,
      totalCorrect,
      accuracy,
      perColumn,
    } satisfies PauliResult;
  } else {
    const config = subtestRow.config as DrawingConfig;
    const tasks = Array.isArray(config?.tasks) ? config.tasks : [];
    const drawings = input.drawings.slice(0, tasks.length);
    const completed = drawings.filter((d) => d.dataUrl.startsWith("data:image/png;base64,")).length;
    score = completed;
    totalQuestions = tasks.length;
    resultPayload = {
      kind: "DRAWING",
      drawings,
      reflection: Array.isArray(config?.reflection) ? config.reflection : [],
    } satisfies DrawingResult;
  }

  const inserted = await databasePool.query<{ id: number }>(
    `INSERT INTO attempts (subtest_id, score, total_questions, finished_at, result)
     VALUES ($1, $2, $3, now(), $4::jsonb) RETURNING id`,
    [input.subtestId, score, totalQuestions, JSON.stringify(resultPayload)],
  );
  return inserted.rows[0].id;
}

interface ReviewRow {
  question_id: number;
  order_index: number;
  prompt: string;
  image_svg: string | null;
  options: QuestionOption[];
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
  explanation: string | null;
  steps: string[] | null;
  wrong_notes: string[] | null;
  quick_tip: string | null;
}

export async function getAttemptResult(attemptId: number): Promise<AttemptResult | null> {
  const attemptResult = await databasePool.query<{
    id: number;
    subtest_id: number;
    score: number | null;
    total_questions: number | null;
    finished_at: Date | string | null;
    result: NonQuizResult | null;
    subtest_name: string;
    subtest_kind: SubtestKind | null;
    package_slug: string;
    package_name: string;
    company_slug: string;
    company_name: string;
  }>(
    `SELECT a.id, a.subtest_id, a.score, a.total_questions, a.finished_at, a.result,
            s.name AS subtest_name, s.kind AS subtest_kind,
            p.slug AS package_slug, p.name AS package_name,
            c.slug AS company_slug, c.name AS company_name
     FROM attempts a
     JOIN subtests s ON s.id = a.subtest_id
     JOIN test_packages p ON p.id = s.test_package_id
     JOIN companies c ON c.id = p.company_id
     WHERE a.id = $1`,
    [attemptId],
  );
  const attemptRow = attemptResult.rows[0];
  if (!attemptRow) {
    return null;
  }

  const reviewResult = await databasePool.query<ReviewRow>(
    `SELECT q.id AS question_id, q.order_index, q.prompt, q.image_svg, q.options,
            an.selected_option, q.correct_option, an.is_correct, q.explanation,
            q.steps, q.wrong_notes, q.quick_tip
     FROM answers an
     JOIN questions q ON q.id = an.question_id
     WHERE an.attempt_id = $1
     ORDER BY q.order_index`,
    [attemptId],
  );

  const reviewItems: ReviewItem[] = reviewResult.rows.map(function mapReview(row) {
    return {
      questionId: row.question_id,
      orderIndex: row.order_index,
      prompt: row.prompt,
      imageSvg: row.image_svg,
      options: row.options,
      selectedOption: row.selected_option,
      correctOption: row.correct_option,
      isCorrect: row.is_correct,
      explanation: row.explanation,
      steps: row.steps,
      wrongNotes: row.wrong_notes,
      quickTip: row.quick_tip,
    };
  });

  const finishedAt =
    attemptRow.finished_at instanceof Date
      ? attemptRow.finished_at.toISOString()
      : attemptRow.finished_at ?? null;

  return {
    attemptId: attemptRow.id,
    subtestId: attemptRow.subtest_id,
    subtestName: attemptRow.subtest_name,
    subtestKind: attemptRow.subtest_kind ?? "QUIZ",
    companySlug: attemptRow.company_slug,
    companyName: attemptRow.company_name,
    packageSlug: attemptRow.package_slug,
    packageName: attemptRow.package_name,
    score: attemptRow.score ?? 0,
    totalQuestions: attemptRow.total_questions ?? 0,
    finishedAt,
    reviewItems,
    result: attemptRow.result ?? null,
  };
}

// ---------------------------------------------------------------- admin

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

export interface UpdatedPackageResult {
  companySlug: string;
  packageSlug: string;
  before: { name: string; description: string | null };
  after: { name: string; description: string | null };
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

export interface UpdatedSubtestResult {
  companySlug: string;
  packageSlug: string;
  packageName: string;
  subtestSlug: string;
  kind: SubtestKind;
  before: { name: string; durationSeconds: number };
  after: { name: string; durationSeconds: number };
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

export interface DeletedPackageMeta {
  companySlug: string;
  companyName: string;
  packageSlug: string;
  packageName: string;
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

export interface DeletedSubtestMeta {
  companySlug: string;
  packageSlug: string;
  packageName: string;
  subtestSlug: string;
  subtestName: string;
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

export interface ExportedPack {
  company: { slug: string; name: string; description?: string };
  package: { slug: string; name: string; description?: string };
  subtests: {
    slug: string;
    name: string;
    description?: string;
    kind?: SubtestKind;
    config?: unknown;
    durationSeconds: number;
    questions?: {
      type: QuestionType;
      prompt: string;
      imageSvg?: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      steps?: string[];
      wrongNotes?: string[];
      quickTip?: string;
    }[];
  }[];
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
                correctIndex: OPTION_KEYS.indexOf(row.correct_option),
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
