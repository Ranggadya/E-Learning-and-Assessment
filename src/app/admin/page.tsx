import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { getAdminOverview } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdminConfigured()) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16">
        <h1 className="text-xl font-bold">Admin belum aktif</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Atur variabel lingkungan <code>ADMIN_PASSWORD</code> di server, lalu muat ulang halaman ini.
        </p>
      </main>
    );
  }
  if (!(await isAdminAuthenticated())) {
    return (
      <main className="px-4">
        <AdminLoginForm />
      </main>
    );
  }

  const companies = await getAdminOverview();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:underline">
            Lihat situs
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link href="/admin/import" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Impor paket soal
        </Link>
        <a href="/api/admin/template" className="text-sm text-blue-600 hover:underline">
          Unduh contoh format
        </a>
      </div>

      {companies.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
          Belum ada paket. Mulai dengan mengimpor satu file paket.
        </p>
      ) : (
        <div className="mt-8 grid gap-6">
          {companies.map(function renderCompany(company) {
            return (
              <section key={company.id} className="rounded-xl border border-slate-300 p-5 dark:border-slate-600">
                <h2 className="text-lg font-semibold">{company.name}</h2>
                <div className="mt-3 grid gap-4">
                  {company.packages.map(function renderPackage(testPackage) {
                    return (
                      <div key={testPackage.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-medium">
                            <Link href={`/c/${company.slug}/${testPackage.slug}`} className="hover:underline">
                              {testPackage.name}
                            </Link>
                          </h3>
                          <div className="flex items-center gap-4">
                            <a
                              href={`/api/admin/packs/${testPackage.id}/export`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Ekspor
                            </a>
                            <DeleteButton
                              url={`/api/admin/packs/${testPackage.id}`}
                              label="Hapus paket"
                              confirmMessage={`Hapus ${company.name} - ${testPackage.name} beserta seluruh soal dan riwayatnya?`}
                            />
                          </div>
                        </div>
                        <ul className="mt-2 divide-y divide-slate-200 text-sm dark:divide-slate-700">
                          {testPackage.subtests.map(function renderSubtest(subtest) {
                            return (
                              <li key={subtest.id} className="flex items-center justify-between gap-2 py-2">
                                <span>
                                  {subtest.name}{" "}
                                  <span className="text-xs text-slate-500">
                                    · {subtest.questionCount} soal · {Math.round(subtest.durationSeconds / 60)} menit
                                  </span>
                                </span>
                                <DeleteButton
                                  url={`/api/admin/subtests/${subtest.id}`}
                                  label="Hapus"
                                  confirmMessage={`Hapus subtes ${subtest.name} beserta soal dan riwayatnya?`}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
