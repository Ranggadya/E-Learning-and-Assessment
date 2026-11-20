import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PackImporter } from "@/components/admin/PackImporter";
import { IconArrowLeft, IconDownload } from "@/components/ui/Icons";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  return (
    <AdminShell activeNav="import">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              <IconArrowLeft className="h-4 w-4" />
              <span>Kembali ke Paket Soal</span>
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Impor Paket Soal</h1>
            <p className="mt-1 max-w-[68ch] text-sm text-ink-secondary">
              Slug perusahaan, paket, atau subtes yang sudah ada akan diperbarui dan soal pada subtes tersebut diganti seluruhnya. Subtes lain di paket yang sama tidak disentuh.
            </p>
          </div>
          <a
            href="/api/admin/template"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-subtle"
          >
            <IconDownload className="h-4 w-4 text-ink-secondary" />
            <span>Unduh Contoh JSON</span>
          </a>
        </div>

        <PackImporter />
      </div>
    </AdminShell>
  );
}
