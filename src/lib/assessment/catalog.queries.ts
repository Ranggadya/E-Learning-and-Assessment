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

interface CompanyRow {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  package_count: string;
  subtest_ids: number[] | null;
}

async function queryCompanies(): Promise<Company[]> {
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

export const getCompanies = unstable_cache(queryCompanies, ["assessment:companies"], {
  tags: [CATALOG_CACHE_TAG],
  revalidate: 3600,
});

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const companies = await getCompanies();
  return companies.find((company) => company.slug === slug) ?? null;
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
  ["assessment:dashboard-catalog"],
  {
    tags: [CATALOG_CACHE_TAG],
    revalidate: 3600,
  },
);

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

export const getPackagesByCompanyId = unstable_cache(
  async function queryPackagesByCompanyId(companyId: number): Promise<TestPackage[]> {
    const result = await databasePool.query<PackageRow>(
      `${PACKAGE_SELECT} WHERE p.company_id = $1 ORDER BY p.name`,
      [companyId],
    );
    return result.rows.map(mapPackage);
  },
  ["assessment:packages-by-company"],
  { tags: [CATALOG_CACHE_TAG], revalidate: 3600 },
);

export const getPackageBySlugs = unstable_cache(
  async function queryPackageBySlugs(
    companySlug: string,
    packageSlug: string,
  ): Promise<TestPackage | null> {
    const result = await databasePool.query<PackageRow>(
      `${PACKAGE_SELECT} JOIN companies c ON c.id = p.company_id WHERE c.slug = $1 AND p.slug = $2`,
      [companySlug, packageSlug],
    );
    return result.rows[0] ? mapPackage(result.rows[0]) : null;
  },
  ["assessment:package-by-slugs"],
  { tags: [CATALOG_CACHE_TAG], revalidate: 3600 },
);

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

function mapSubtest(row: SubtestRow, includeConfig = true): Subtest {
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
    config: includeConfig ? (row.config ?? null) : null,
  };
}

export const getSubtestsByPackageId = unstable_cache(
  async function querySubtestsByPackageId(testPackageId: number): Promise<Subtest[]> {
    const result = await databasePool.query<SubtestRow>(
      `SELECT s.id, s.test_package_id, s.slug, s.name, s.description,
              s.duration_seconds, s.order_index, s.kind, s.config,
              COALESCE(q_stats.question_count, '0') AS question_count,
              q_stats.question_types
       FROM subtests s
       LEFT JOIN (
         SELECT subtest_id,
                COUNT(*)::text AS question_count,
                ARRAY_AGG(DISTINCT type) AS question_types
         FROM questions
         GROUP BY subtest_id
       ) q_stats ON q_stats.subtest_id = s.id
       WHERE s.test_package_id = $1
       ORDER BY s.order_index`,
      [testPackageId],
    );
    return result.rows.map((row) => mapSubtest(row, false));
  },
  ["assessment:subtests-by-package"],
  { tags: [CATALOG_CACHE_TAG], revalidate: 3600 },
);

export const getPackageDetailBySlugs = unstable_cache(
  async function queryPackageDetailBySlugs(
    companySlug: string,
    packageSlug: string,
  ): Promise<{ company: Company; testPackage: TestPackage; subtests: Subtest[] } | null> {
    const [companies, pkg] = await Promise.all([
      getCompanies(),
      getPackageBySlugs(companySlug, packageSlug),
    ]);
    const company = companies.find((item) => item.slug === companySlug);
    if (!company || !pkg) {
      return null;
    }
    const subtests = await getSubtestsByPackageId(pkg.id);
    return { company, testPackage: pkg, subtests };
  },
  ["assessment:package-detail-by-slugs"],
  { tags: [CATALOG_CACHE_TAG], revalidate: 3600 },
);

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
    return {
      ...mapSubtest(row, true),
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
