import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BelajarUserSync } from "@/components/belajar/BelajarUserSync";
import { LessonInteractiveFooter } from "@/components/belajar/LessonInteractiveFooter";
import { LessonMarkdown } from "@/components/belajar/LessonMarkdown";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronRight,
  IconClock,
  IconExternalLink,
} from "@/components/ui/Icons";
import {
  getLessonQuizQuestions,
  getPublishedLessonDetail,
} from "@/lib/belajar/belajar.queries";
import { LESSON_LEVEL_LABEL } from "@/lib/belajar/constants";
import { getGlossaryEntries } from "@/lib/belajar/glossary";
import { parseMarkdownBlocks } from "@/lib/belajar/markdown";
import { ANON_USER_COOKIE } from "@/lib/english/constants";
import { isValidAnonUserId } from "@/lib/english/logic";

interface LessonPageProps {
  params: Promise<{ jalur: string; pelajaran: string }>;
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { jalur, pelajaran } = await params;
  const lesson = await getPublishedLessonDetail(jalur, pelajaran, null);
  return {
    title: lesson ? `${lesson.title} · ${lesson.trackTitle}` : "Pelajaran",
  };
}

export default async function LessonReaderPage({ params }: LessonPageProps) {
  const [{ jalur, pelajaran }, cookieStore] = await Promise.all([params, cookies()]);
  const rawUserKey = cookieStore.get(ANON_USER_COOKIE)?.value ?? null;
  const userKey = isValidAnonUserId(rawUserKey) ? rawUserKey : null;

  const [lesson, quizQuestions] = await Promise.all([
    getPublishedLessonDetail(jalur, pelajaran, userKey),
    getLessonQuizQuestions(pelajaran),
  ]);

  if (!lesson) {
    notFound();
  }

  const glossary = getGlossaryEntries();
  const blocks = parseMarkdownBlocks(lesson.bodyMd, glossary);
  const unmetPrereqs = lesson.prerequisites.filter((p) => !p.isDone);

  return (
    <div className="w-full space-y-6">
      <BelajarUserSync serverHasUserKey={Boolean(userKey)} />

      {/* Breadcrumb & Header Pelajaran */}
      <div>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          <Link href="/belajar" className="transition hover:text-ink">
            Roadmap
          </Link>
          <IconChevronRight className="h-3.5 w-3.5" />
          <Link href={`/belajar/${lesson.trackSlug}`} className="transition hover:text-ink">
            {lesson.trackTitle}
          </Link>
          {lesson.chapter ? (
            <>
              <IconChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-ink">{lesson.chapter}</span>
            </>
          ) : null}
        </nav>

        <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
          {lesson.title}
        </h1>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-subtle px-2.5 py-1 font-semibold text-ink-secondary">
            {LESSON_LEVEL_LABEL[lesson.level]}
          </span>
          {lesson.estimatedMinutes ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-2.5 py-1 font-medium text-ink-secondary tabular-nums">
              <IconClock className="h-3.5 w-3.5" />
              <span>{lesson.estimatedMinutes} menit baca</span>
            </span>
          ) : null}
          <Link
            href="/belajar/glosarium"
            className="text-xs font-semibold text-brand-text hover:underline"
          >
            Istilah bergaris titik punya tooltip glosarium
          </Link>
        </div>
      </div>

      {/* Info Prasyarat bila belum diselesaikan */}
      {unmetPrereqs.length > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200">
          <strong className="font-bold">Catatan prasyarat:</strong> Disarankan menyelesaikan{" "}
          {unmetPrereqs.map((p, idx) => (
            <span key={p.id}>
              {idx > 0 ? ", " : ""}
              <Link
                href={`/belajar/${p.trackSlug}/${p.slug}`}
                className="font-bold underline"
              >
                {p.title}
              </Link>
            </span>
          ))}{" "}
          lebih dulu, namun kamu tetap bebas lanjut membaca halaman ini.
        </div>
      ) : null}

      {/* Isi Artikel Markdown */}
      <article className="rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none sm:p-8">
        <LessonMarkdown blocks={blocks} />
      </article>

      {/* Kuis Akhir & Tombol Tandai Selesai */}
      <LessonInteractiveFooter
        lessonId={lesson.id}
        lessonSlug={lesson.slug}
        initialStatus={lesson.progressStatus}
        initialQuizScore={lesson.quizScore}
        quizQuestions={quizQuestions}
      />

      {/* Kotak Atribusi Sumber (Wajib tampil bila origin bukan original, atau jika ada referensi) */}
      {(lesson.origin !== "original" || lesson.sources.length > 0) && lesson.sources.length > 0 ? (
        <aside
          aria-label="Atribusi dan sumber materi"
          className="rounded-2xl border border-line bg-canvas p-5 text-xs leading-relaxed text-ink-secondary"
        >
          <h2 className="text-xs font-extrabold text-ink">
            {lesson.origin !== "original"
              ? "Atribusi Sumber & Lisensi (Materi Terjemahan / Campuran)"
              : "Referensi Bacaan Lanjutan"}
          </h2>
          <ul className="mt-2.5 space-y-2">
            {lesson.sources.map((src, idx) => (
              <li key={idx} className="rounded-xl border border-line bg-surface p-3">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-brand-text hover:underline"
                >
                  <span>{src.title}</span>
                  <IconExternalLink className="h-3.5 w-3.5" />
                </a>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-ink-muted">
                  {src.author ? <span>Penulis: {src.author}</span> : null}
                  {src.license ? <span>Lisensi: {src.license}</span> : null}
                  {src.changes ? <span>Perubahan: {src.changes}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      {/* Navigasi Pelajaran Sebelumnya / Berikutnya */}
      <nav
        aria-label="Navigasi pelajaran"
        className="flex flex-col justify-between gap-3 pt-2 sm:flex-row"
      >
        {lesson.prevLesson ? (
          <Link
            href={`/belajar/${lesson.trackSlug}/${lesson.prevLesson.slug}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-subtle"
          >
            <IconArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{lesson.prevLesson.title}</span>
          </Link>
        ) : (
          <span />
        )}

        {lesson.nextLesson ? (
          <Link
            href={`/belajar/${lesson.trackSlug}/${lesson.nextLesson.slug}`}
            className="inline-flex min-h-[44px] items-center justify-end gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-subtle"
          >
            <span className="truncate">{lesson.nextLesson.title}</span>
            <IconArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
