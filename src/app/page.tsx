import Link from "next/link";
import { getCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const companies = await getCompanies();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">e-assessment</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Pilih perusahaan, pilih paket, lalu kerjakan per subtes dengan timer dan lihat pembahasannya.
      </p>

      {companies.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
          Belum ada soal. Unggah paket soal lewat halaman admin.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {companies.map(function renderCompany(company) {
            return (
              <li key={company.id}>
                <Link
                  href={`/c/${company.slug}`}
                  className="block rounded-xl border border-slate-300 p-5 transition hover:border-blue-600 hover:shadow dark:border-slate-600"
                >
                  <h2 className="text-xl font-semibold">{company.name}</h2>
                  {company.description ? (
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{company.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">{company.packageCount} paket</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-12 text-xs text-slate-400">
        <Link href="/admin" className="hover:underline">
          Admin
        </Link>
      </footer>
    </main>
  );
}
