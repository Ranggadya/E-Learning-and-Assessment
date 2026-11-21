import { databasePool } from "./db";
import type {
  AdminCompany,
  AttemptResult,
  Company,
  DashboardCompany,
  PublicQuestion,
  QuestionOption,
  QuestionType,
  ReviewItem,
  Subtest,
  SubtestKind,
  SubtestLocation,
  SubmitAttemptInput,
  TestPackage,
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
}

export async function getCompanies(): Promise<Company[]> {
  const result = await databasePool.query<CompanyRow>(
    `SELECT c.id, c.slug, c.name, c.description,
            (SELECT COUNT(*) FROM test_packages p WHERE p.company_id = c.id) AS package_count
     FROM companies c ORDER BY c.name`,
  );
  return result.rows.map(function mapCompany(row) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      packageCount: Number(row.package_count),
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
      testPackage.subtests.push({
        id: row.subtest_id,
        slug: row.subtest_slug,
        name: row.subtest_name,
        durationSeconds: row.duration_seconds ?? 0,
        questionCount: Number(row.question_count ?? 0),
        questionTypes: normalizeQuestionTypes(row.question_types),
        kind: (row.subtest_kind as SubtestKind) ?? "QUIZ",
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
  return {
    id: row.id,
    testPackageId: row.test_package_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    durationSeconds: row.duration_seconds,
    orderIndex: row.order_index,
    questionCount: Number(row.question_count),
    questionTypes: normalizeQuestionTypes(row.question_types),
    kind: (row.kind as SubtestKind) ?? "QUIZ",
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
    for (const [questionId, correctOption] of correctOptionByQuestionId) {
      const selectedOption = selectedByQuestionId.get(questionId) ?? null;
      const isCorrect = selectedOption !== null && selectedOption === correctOption;
      if (isCorrect) {
        score += 1;
      }
      await client.query(
        `INSERT INTO answers (attempt_id, question_id, selected_option, is_correct)
         VALUES ($1, $2, $3, $4)`,
        [attemptId, questionId, selectedOption, isCorrect],
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
    subtest_name: string;
    package_slug: string;
    package_name: string;
    company_slug: string;
    company_name: string;
  }>(
    `SELECT a.id, a.subtest_id, a.score, a.total_questions, a.finished_at,
            s.name AS subtest_name,
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
    companySlug: attemptRow.company_slug,
    companyName: attemptRow.company_name,
    packageSlug: attemptRow.package_slug,
    packageName: attemptRow.package_name,
    score: attemptRow.score ?? 0,
    totalQuestions: attemptRow.total_questions ?? 0,
    finishedAt,
    reviewItems,
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
    subtest_id: number | null;
    subtest_slug: string | null;
    subtest_name: string | null;
    duration_seconds: number | null;
    subtest_kind: string | null;
    subtest_config: unknown | null;
    question_count: string | null;
  }>(
    `SELECT c.id AS company_id, c.slug AS company_slug, c.name AS company_name,
            p.id AS package_id, p.slug AS package_slug, p.name AS package_name,
            s.id AS subtest_id, s.slug AS subtest_slug, s.name AS subtest_name, s.duration_seconds,
            s.kind AS subtest_kind, s.config AS subtest_config,
            (SELECT COUNT(*) FROM questions q WHERE q.subtest_id = s.id) AS question_count
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
      testPackage = { id: packageId, slug: row.package_slug, name: row.package_name, subtests: [] };
      company.packages.push(testPackage);
    }
    if (row.subtest_id !== null && row.subtest_slug !== null && row.subtest_name !== null) {
      testPackage.subtests.push({
        id: row.subtest_id,
        slug: row.subtest_slug,
        name: row.subtest_name,
        durationSeconds: row.duration_seconds ?? 0,
        questionCount: Number(row.question_count ?? 0),
        kind: (row.subtest_kind as SubtestKind) ?? "QUIZ",
        config: row.subtest_config ?? null,
      });
    }
  }
  return companies;
}

// Menghapus paket; perusahaan yang tidak punya paket lagi ikut dihapus agar tidak jadi kosong di beranda.
export async function deletePackage(packageId: number): Promise<boolean> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const deleted = await client.query<{ company_id: number }>(
      "DELETE FROM test_packages WHERE id = $1 RETURNING company_id",
      [packageId],
    );
    if (deleted.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `DELETE FROM companies c WHERE c.id = $1
       AND NOT EXISTS (SELECT 1 FROM test_packages p WHERE p.company_id = c.id)`,
      [deleted.rows[0].company_id],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteSubtest(subtestId: number): Promise<boolean> {
  const result = await databasePool.query("DELETE FROM subtests WHERE id = $1", [subtestId]);
  return (result.rowCount ?? 0) > 0;
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

  const subtests: ExportedPack["subtests"] = [];
  for (const subtestRow of subtestResult.rows) {
    const questionResult = await databasePool.query<{
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
      `SELECT type, prompt, image_svg, options, correct_option, explanation, steps, wrong_notes, quick_tip
       FROM questions WHERE subtest_id = $1 ORDER BY order_index`,
      [subtestRow.id],
    );
    subtests.push({
      slug: subtestRow.slug,
      name: subtestRow.name,
      ...(subtestRow.description ? { description: subtestRow.description } : {}),
      durationSeconds: subtestRow.duration_seconds,
      ...(subtestRow.kind && subtestRow.kind !== "QUIZ" ? { kind: subtestRow.kind as SubtestKind } : {}),
      ...(subtestRow.config ? { config: subtestRow.config } : {}),
      ...(questionResult.rows.length > 0
        ? {
            questions: questionResult.rows.map(function mapExportedQuestion(row) {
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
    });
  }

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
