import Link from "next/link";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { IconAlertTriangle, IconArrowLeft } from "@/components/ui/Icons";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdminConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300">
            <IconAlertTriangle className="h-5 w-5 shrink-0" />
            <h1 className="text-lg font-bold text-ink">Admin belum aktif</h1>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
            Atur variabel lingkungan{" "}
            <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-xs text-ink">
              ADMIN_PASSWORD
            </code>{" "}
            di server, lalu muat ulang halaman ini.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text hover:underline"
          >
            <IconArrowLeft className="h-4 w-4" />
            <span>Kembali ke situs</span>
          </Link>
        </div>
      </main>
    );
  }

  if (!(await isAdminAuthenticated())) {
    return <AdminLoginForm />;
  }

  const companies = await getAdminOverview();

  return (
    <AdminShell activeNav="dashboard">
      <AdminDashboardClient companies={companies} />
    </AdminShell>
  );
}
