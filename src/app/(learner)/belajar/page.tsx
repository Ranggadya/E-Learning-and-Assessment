import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { BelajarUserSync } from "@/components/belajar/BelajarUserSync";
import {
  IconArrowRight,
  IconBookOpen,
  IconLayers,
  IconSearch,
} from "@/components/ui/Icons";
import { getTracksWithProgress } from "@/lib/belajar/belajar.queries";
import { ANON_USER_COOKIE } from "@/lib/english/constants";
import { isValidAnonUserId } from "@/lib/english/logic";

export const metadata: Metadata = {
  title: "Belajar Roadmap Software Engineer",
};

export default async function BelajarRoadmapPage() {
  const cookieStore = await cookies();
  const rawUserKey = cookieStore.get(ANON_USER_COOKIE)?.value ?? null;
  const userKey = isValidAnonUserId(rawUserKey) ? rawUserKey : null;
  const tracks = await getTracksWithProgress(userKey);

  return (
    <div className="space-y-6">
      <BelajarUserSync serverHasUserKey={Boolean(userKey)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
            Roadmap Software Engineer
          </h1>
          <p className="mt-1 max-w-[68ch] text-sm text-ink-secondary">
            Jalur belajar bertahap berbahasa Indonesia dengan istilah teknis tetap dalam bahasa Inggris. Kemajuan disimpan otomatis di perangkatmu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/belajar/cari"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
          >
            <IconSearch className="h-3.5 w-3.5" />
            <span>Cari Materi</span>
          </Link>
          <Link
            href="/belajar/glosarium"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
          >
            <IconBookOpen className="h-3.5 w-3.5" />
            <span>Glosarium Istilah</span>
          </Link>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm font-bold text-ink">Jalur belajar belum diinisialisasi.</p>
          <p className="mt-1 text-xs text-ink-muted">
            Jalankan <code className="rounded bg-subtle px-1.5 py-0.5 font-mono">npm run db:migrate</code> atau buka <code className="rounded bg-subtle px-1.5 py-0.5 font-mono">/admin/materi</code>.
          </p>
        </div>
      ) : (
        <section aria-label="Daftar jalur belajar" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tracks.map((track, idx) => (
            <Link
              key={track.id}
              href={`/belajar/${track.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] transition hover:border-line-strong dark:shadow-none"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-subtle px-2.5 py-0.5 text-xs font-bold text-ink-secondary tabular-nums">
                    <IconLayers className="h-3.5 w-3.5" />
                    <span>Jalur {idx + 1}</span>
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-brand-text">
                    {track.progressPercent}%
                  </span>
                </div>

                <h2 className="mt-3 text-lg font-extrabold text-ink group-hover:text-brand-text">
                  {track.title}
                </h2>
                {track.description ? (
                  <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                    {track.description}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 space-y-2 border-t border-line pt-4">
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-subtle"
                  role="progressbar"
                  aria-valuenow={track.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Kemajuan ${track.title}`}
                >
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-200"
                    style={{ width: `${track.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span className="tabular-nums">
                    {track.completedLessons} / {track.totalLessons} pelajaran selesai
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-brand-text">
                    <span>Buka Jalur</span>
                    <IconArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
