import { unstable_cache } from "next/cache";
import { databasePool } from "@/lib/db/pool";
import type {
  Company,
  DashboardCompany,
  PublicQuestion,
  QuestionOption,
  QuestionType,
  Subtest,
  SubtestKind,
  SubtestLocation,
  TestPackage,
} from "@/types/assessment";
import { VALID_QUESTION_TYPES } from "./constants";
import { catalogToCompanies } from "./dashboard";
import { countSubtestItems } from "./scoring";

export const CATALOG_CACHE_TAG = "catalog";

function normalizeQuestionTypes(raw: string[] | null | undefined): QuestionType[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<QuestionType>();
  for (const item of raw) {
    if (VALID_QUESTION_TYPES.has(item as QuestionType)) {
      seen.add(item as QuestionType);
    }
  }
  return Array.from(seen);
}

async function queryDashboardCatalog(): Promise<DashboardCompany[]> {
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
    subtest_description: string | null;
    order_index: number | null;
    duration_seconds: number | null;
    subtest_kind: string | null;
    subtest_config: unknown | null;
    question_count: string | null;
    question_types: string[] | null;
  }>(
    `SELECT c.id AS company_id, c.slug AS company_slug, c.name AS company_name, c.description AS company_description,
            p.id AS package_id, p.slug AS package_slug, p.name AS package_name, p.description AS package_description,
            s.id AS subtest_id, s.slug AS subtest_slug, s.name AS subtest_name, s.description AS subtest_description,
            s.order_index, s.duration_seconds, s.kind AS subtest_kind, s.config AS subtest_config,
            q_stats.question_count,
            q_stats.question_types
     FROM companies c
     LEFT JOIN test_packages p ON p.company_id = c.id
     LEFT JOIN subtests s ON s.test_package_id = p.id
     LEFT JOIN (
       SELECT subtest_id,
              COUNT(*)::text AS question_count,
              ARRAY_AGG(DISTINCT type) AS question_types
       FROM questions
       GROUP BY subtest_id
     ) q_stats ON q_stats.subtest_id = s.id
     ORDER BY c.name, p.name, s.order_index`,
  );

  const companiesMap = new Map<number, DashboardCompany>();
  const packagesMap = new Map<number, DashboardCompany["packages"][number]>();
  const companies: DashboardCompany[] = [];

  for (const row of result.rows) {
    let company = companiesMap.get(row.company_id);
    if (!company) {
      company = {
        id: row.company_id,
        slug: row.company_slug,
        name: row.company_name,
        description: row.company_description,
        packages: [],
      };
      companiesMap.set(row.company_id, company);
      companies.push(company);
    }
    if (row.package_id === null || row.package_slug === null || row.package_name === null) {
      continue;
    }
    let testPackage = packagesMap.get(row.package_id);
    if (!testPackage) {
      testPackage = {
        id: row.package_id,
        slug: row.package_slug,
        name: row.package_name,
        description: row.package_description,
        subtests: [],
      };
      packagesMap.set(row.package_id, testPackage);
      company.packages.push(testPackage);
    }
    if (row.subtest_id !== null && row.subtest_slug !== null && row.subtest_name !== null) {
      const kind = (row.subtest_kind as SubtestKind) ?? "QUIZ";
      testPackage.subtests.push({
        id: row.subtest_id,
        slug: row.subtest_slug,
        name: row.subtest_name,
        description: row.subtest_description,
        orderIndex: row.order_index ?? testPackage.subtests.length + 1,
        durationSeconds: row.duration_seconds ?? 0,
        questionCount: countSubtestItems(kind, Number(row.question_count ?? 0), row.subtest_config),
        questionTypes: normalizeQuestionTypes(row.question_types),
        kind,
        // Jangan kirim JSON config besar (pernyataan kepribadian/instruksi gambar) ke RSC payload katalog.
        config: null,
      });
    }
  }
  return companies;
}

export const getDashboardCatalog = unstable_cache(
  queryDashboardCatalog,
  ["assessment:dashboard-catalog:v2"],
  {
    tags: [CATALOG_CACHE_TAG],
    revalidate: 3600,
  },
);

// Menurunkan detail paket langsung dari katalog ter-cache sehingga tidak memicu 3 query DB terpisah.
export async function getPackageDetailBySlugs(
  companySlug: string,
  packageSlug: string,
): Promise<{ company: Company; testPackage: TestPackage; subtests: Subtest[] } | null> {
  const catalog = await getDashboardCatalog();
  const dashboardCompany = catalog.find((item) => item.slug === companySlug);
  const dashboardPackage = dashboardCompany?.packages.find((item) => item.slug === packageSlug);
  if (!dashboardCompany || !dashboardPackage) {
    return null;
  }

  const company = catalogToCompanies([dashboardCompany])[0];
  const subtests: Subtest[] = dashboardPackage.subtests.map((sub, idx) => ({
    id: sub.id,
    testPackageId: dashboardPackage.id,
    slug: sub.slug,
    name: sub.name,
    description: sub.description ?? null,
    durationSeconds: sub.durationSeconds,
    orderIndex: sub.orderIndex ?? idx + 1,
    questionCount: sub.questionCount,
    questionTypes: sub.questionTypes,
    kind: sub.kind,
    config: null,
  }));

  const quizQuestionCount = subtests.reduce(
    (sum, sub) => sum + (sub.kind === "QUIZ" ? sub.questionCount : 0),
    0,
  );
  const totalItemCount = subtests.reduce((sum, sub) => sum + sub.questionCount, 0);

  const testPackage: TestPackage = {
    id: dashboardPackage.id,
    companyId: dashboardCompany.id,
    slug: dashboardPackage.slug,
    name: dashboardPackage.name,
    description: dashboardPackage.description,
    subtestCount: subtests.length,
    questionCount: quizQuestionCount > 0 ? quizQuestionCount : totalItemCount,
  };

  return { company, testPackage, subtests };
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

export const getSubtestById = unstable_cache(
  async function querySubtestById(subtestId: number): Promise<SubtestLocation | null> {
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
      companySlug: row.company_slug,
      companyName: row.company_name,
      packageSlug: row.package_slug,
      packageName: row.package_name,
    };
  },
  ["assessment:subtest-by-id"],
  { tags: [CATALOG_CACHE_TAG], revalidate: 3600 },
);

interface QuestionRow {
  id: number;
  type: QuestionType;
  order_index: number;
  prompt: string;
  image_svg: string | null;
  options: QuestionOption[];
}

// Kunci jawaban sengaja tidak ikut dipilih agar tidak bocor ke browser peserta.
export const getPublicQuestions = unstable_cache(
  async function queryPublicQuestions(subtestId: number): Promise<PublicQuestion[]> {
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
  },
  ["assessment:public-questions"],
  { tags: [CATALOG_CACHE_TAG], revalidate: 3600 },
);
