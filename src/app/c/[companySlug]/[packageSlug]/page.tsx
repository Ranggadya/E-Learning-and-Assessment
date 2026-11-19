import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyBySlug, getPackageBySlugs, getSubtestsByPackageId } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface PackagePageProps {
  params: Promise<{ companySlug: string; packageSlug: string }>;
}

export default async function PackagePage({ params }: PackagePageProps) {
  const { companySlug, packageSlug } = await params;
  const [company, testPackage] = await Promise.all([
    getCompanyBySlug(companySlug),
    getPackageBySlugs(companySlug, packageSlug),
  ]);
  if (!company || !testPackage) {
    notFound();
  }
  const subtests = await getSubtestsByPackageId(testPackage.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href={`/c/${company.slug}`} className="text-sm text-blue-600 hover:underline">
        ← {company.name}
      </Link>
      <h1 className="mt-3 text-3xl font-bold">
        {company.name} · {testPackage.name}
      </h1>
      {testPackage.description ? (
        <p className="mt-2 text-slate-600 dark:text-slate-300">{testPackage.description}</p>
      ) : null}

      <ol className="mt-8 grid gap-3">
        {subtests.map(function renderSubtest(subtest) {
          const durationMinutes = Math.max(1, Math.round(subtest.durationSeconds / 60));
          return (
            <li
              key={subtest.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-300 p-4 dark:border-slate-600"
            >
              <div>
                <h2 className="font-semibold">{subtest.name}</h2>
                {subtest.description ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{subtest.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {subtest.questionCount} soal · {durationMinutes} menit
                </p>
              </div>
              {subtest.questionCount > 0 ? (
                <Link
                  href={`/test/${subtest.id}`}
                  className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Mulai
                </Link>
              ) : (
                <span className="shrink-0 text-xs text-slate-400">Belum ada soal</span>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
