import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyBySlug, getPackagesByCompanyId } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface CompanyPageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);
  if (!company) {
    notFound();
  }
  const packages = await getPackagesByCompanyId(company.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Semua perusahaan
      </Link>
      <h1 className="mt-3 text-3xl font-bold">{company.name}</h1>
      {company.description ? (
        <p className="mt-2 text-slate-600 dark:text-slate-300">{company.description}</p>
      ) : null}

      <ul className="mt-8 grid gap-4">
        {packages.map(function renderPackage(testPackage) {
          return (
            <li key={testPackage.id}>
              <Link
                href={`/c/${company.slug}/${testPackage.slug}`}
                className="block rounded-xl border border-slate-300 p-5 transition hover:border-blue-600 hover:shadow dark:border-slate-600"
              >
                <h2 className="text-xl font-semibold">{testPackage.name}</h2>
                {testPackage.description ? (
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{testPackage.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  {testPackage.subtestCount} subtes · {testPackage.questionCount} soal
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
