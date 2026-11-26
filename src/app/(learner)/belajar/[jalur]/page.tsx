import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BelajarUserSync } from "@/components/belajar/BelajarUserSync";
import { TrackLessonListClient } from "@/components/belajar/TrackLessonListClient";
import { IconArrowLeft } from "@/components/ui/Icons";
import { getTrackWithLessonsForUser } from "@/lib/belajar/belajar.queries";
import { ANON_USER_COOKIE } from "@/lib/english/constants";
import { isValidAnonUserId } from "@/lib/english/logic";

interface TrackPageProps {
  params: Promise<{ jalur: string }>;
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { jalur } = await params;
  const data = await getTrackWithLessonsForUser(jalur, null);
  return {
    title: data ? `${data.track.title} · Belajar` : "Jalur Belajar",
  };
}

export default async function TrackLessonsPage({ params }: TrackPageProps) {
  const [{ jalur }, cookieStore] = await Promise.all([params, cookies()]);
  const rawUserKey = cookieStore.get(ANON_USER_COOKIE)?.value ?? null;
  const userKey = isValidAnonUserId(rawUserKey) ? rawUserKey : null;

  const data = await getTrackWithLessonsForUser(jalur, userKey);
  if (!data) {
    notFound();
  }

  const { track, lessons } = data;

  return (
    <div className="space-y-5">
      <BelajarUserSync serverHasUserKey={Boolean(userKey)} />

      <div>
        <Link
          href="/belajar"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-ink-secondary transition hover:text-ink"
        >
          <IconArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Peta Roadmap</span>
        </Link>

        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
              {track.title}
            </h1>
            {track.description ? (
              <p className="mt-1 max-w-[68ch] text-sm text-ink-secondary">{track.description}</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs">
            <span className="text-ink-muted">Kemajuan jalur: </span>
            <strong className="font-mono font-bold tabular-nums text-brand-text">
              {track.completedLessons}/{track.totalLessons} ({track.progressPercent}%)
            </strong>
          </div>
        </div>
      </div>

      <TrackLessonListClient trackSlug={track.slug} lessons={lessons} />
    </div>
  );
}
