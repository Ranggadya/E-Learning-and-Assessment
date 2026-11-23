import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PackImporter } from "@/components/admin/PackImporter";
import { IconArrowLeft, IconDownload } from "@/components/ui/Icons";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  if (!isAdminConfigured() || !(await isAdminAuthenticated())) {
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
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]">
              Impor Paket &amp; Pembahasan
            </h1>
            <p className="mt-1 max-w-[70ch] text-sm text-ink-secondary">
              Sistem otomatis mendeteksi file paket soal maupun file{" "}
              <code className="rounded border border-line bg-subtle px-1 py-0.5 font-mono text-xs text-ink">
                pembahasanSaja
              </code>
              . Setiap file diperiksa lewat dry-run untuk mendeteksi duplikasi isi, perubahan soal,
              dan risiko menimpa pembahasan rinci sebelum disimpan.
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
