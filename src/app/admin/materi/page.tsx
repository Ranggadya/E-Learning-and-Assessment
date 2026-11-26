import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { LessonMateriManager } from "@/components/admin/LessonMateriManager";
import { IconArrowLeft, IconExternalLink } from "@/components/ui/Icons";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin/auth";
import { listAdminBelajarData } from "@/lib/belajar/belajar.queries";

export const dynamic = "force-dynamic";

export default async function AdminMateriPage() {
  if (!isAdminConfigured() || !(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const { tracks, lessons } = await listAdminBelajarData();

  return (
    <AdminShell activeNav="materi">
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
              CMS Materi Roadmap (<code className="font-mono">.md</code>)
            </h1>
            <p className="mt-1 max-w-[70ch] text-sm text-ink-secondary">
              Unggah banyak file Markdown pelajaran sekaligus, periksa hasil validasi front-matter, kelola status{" "}
              <code className="rounded border border-line bg-subtle px-1 py-0.5 font-mono text-xs text-ink">
                draft
              </code>{" "}
              ke{" "}
              <code className="rounded border border-line bg-subtle px-1 py-0.5 font-mono text-xs text-ink">
                reviewed
              </code>
              , atau hapus pelajaran.
            </p>
          </div>

          <Link
            href="/belajar"
            target="_blank"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-subtle"
          >
            <IconExternalLink className="h-4 w-4 text-ink-secondary" />
            <span>Lihat /belajar</span>
          </Link>
        </div>

        <LessonMateriManager initialTracks={tracks} initialLessons={lessons} />
      </div>
    </AdminShell>
  );
}
