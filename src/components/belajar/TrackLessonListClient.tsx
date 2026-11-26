"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconLayers,
} from "@/components/ui/Icons";
import { LESSON_LEVEL_LABEL } from "@/lib/belajar/constants";
import type { TrackLessonItem } from "@/types/belajar";

const BYPASS_STORAGE_KEY = "e-assessment:belajar-bypass:v1";

function readInitialBypasses(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BYPASS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

interface ChapterGroup {
  chapterTitle: string;
  lessons: TrackLessonItem[];
}

export function TrackLessonListClient({
  trackSlug,
  lessons,
}: {
  trackSlug: string;
  lessons: TrackLessonItem[];
}) {
  const [bypassedSlugs, setBypassedSlugs] = useState<string[]>(readInitialBypasses);
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

  function handleBypass(slug: string) {
    setBypassedSlugs((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      try {
        window.localStorage.setItem(BYPASS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Abaikan jika localStorage penuh/diblokir.
      }
      return next;
    });
  }

  function toggleChapter(key: string) {
    setCollapsedChapters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const chapterGroups = useMemo<ChapterGroup[]>(() => {
    const groups: ChapterGroup[] = [];
    const byName = new Map<string, ChapterGroup>();
    for (const lesson of lessons) {
      const chapterTitle = lesson.chapter?.trim() || "Materi Utama";
      let group = byName.get(chapterTitle);
      if (!group) {
        group = { chapterTitle, lessons: [] };
        byName.set(chapterTitle, group);
        groups.push(group);
      }
      group.lessons.push(lesson);
    }
    return groups;
  }, [lessons]);

  if (lessons.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-sm font-semibold text-ink">
          Belum ada pelajaran berstatus reviewed pada jalur ini.
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Impor file Markdown pelajaran dan ubah statusnya menjadi reviewed di halaman /admin/materi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {chapterGroups.map((group, groupIdx) => {
        const isCollapsed = Boolean(collapsedChapters[group.chapterTitle]);
        const doneCount = group.lessons.filter((l) => l.progressStatus === "done").length;
        const totalCount = group.lessons.length;
        const totalMinutes = group.lessons.reduce(
          (sum, l) => sum + (l.estimatedMinutes ?? 0),
          0,
        );

        return (
          <section
            key={group.chapterTitle}
            aria-label={`Bab ${groupIdx + 1}: ${group.chapterTitle}`}
            className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none"
          >
            {/* Header Bab */}
            <button
              type="button"
              onClick={() => toggleChapter(group.chapterTitle)}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center justify-between gap-4 border-b border-line bg-canvas/80 px-5 py-4 text-left transition hover:bg-subtle/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2.5 py-0.5 text-xs font-extrabold text-brand-text">
                    <IconLayers className="h-3.5 w-3.5" />
                    <span>Bab {groupIdx + 1}</span>
                  </span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-ink-secondary">
                    {doneCount}/{totalCount} subbab selesai
                  </span>
                  {totalMinutes > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-muted tabular-nums">
                      <IconClock className="h-3.5 w-3.5" />
                      <span>Total {totalMinutes} mnt</span>
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-1.5 text-lg font-extrabold tracking-tight text-ink">
                  {group.chapterTitle}
                </h2>
              </div>

              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isCollapsed ? "-rotate-90" : "rotate-0"
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            {/* Daftar Subbab di dalam Bab */}
            {!isCollapsed ? (
              <ol className="divide-y divide-line">
                {group.lessons.map((lesson, subIdx) => {
                  const isDone = lesson.progressStatus === "done";
                  const isBypassed = bypassedSlugs.includes(lesson.slug);
                  const isLocked =
                    !isDone && lesson.unmetPrerequisites.length > 0 && !isBypassed;

                  return (
                    <li
                      key={lesson.id}
                      className="flex flex-col gap-3 p-4 transition hover:bg-canvas/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-subtle px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-ink-secondary">
                            Subbab {groupIdx + 1}.{subIdx + 1}
                          </span>
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <IconCheckCircle className="h-3.5 w-3.5" />
                              <span>Selesai</span>
                            </span>
                          ) : isLocked ? (
                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300">
                              Terkunci
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-text">
                              Bisa dimulai
                            </span>
                          )}

                          <span className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-ink-secondary">
                            {LESSON_LEVEL_LABEL[lesson.level]}
                          </span>

                          {lesson.estimatedMinutes ? (
                            <span className="inline-flex items-center gap-1 text-xs text-ink-muted tabular-nums">
                              <IconClock className="h-3.5 w-3.5" />
                              <span>{lesson.estimatedMinutes} mnt</span>
                            </span>
                          ) : null}

                          {lesson.quizScore !== null ? (
                            <span className="font-mono text-xs font-semibold tabular-nums text-ink-secondary">
                              Kuis: {lesson.quizScore}%
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-1.5 text-base font-bold text-ink">{lesson.title}</h3>

                        {lesson.unmetPrerequisites.length > 0 ? (
                          <p className="mt-1 text-xs text-ink-muted">
                            Prasyarat belum selesai:{" "}
                            {lesson.unmetPrerequisites.map((req, rIdx) => (
                              <span key={req.id}>
                                {rIdx > 0 ? ", " : ""}
                                <Link
                                  href={`/belajar/${req.trackSlug}/${req.slug}`}
                                  className="font-semibold text-brand-text hover:underline"
                                >
                                  {req.title}
                                </Link>
                              </span>
                            ))}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {isLocked ? (
                          <button
                            type="button"
                            onClick={() => handleBypass(lesson.slug)}
                            className="inline-flex min-h-[40px] items-center rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
                          >
                            Lewati manual
                          </button>
                        ) : (
                          <Link
                            href={`/belajar/${trackSlug}/${lesson.slug}`}
                            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                              isDone
                                ? "border border-line-strong bg-surface text-ink hover:bg-subtle"
                                : "bg-brand text-white hover:bg-brand-hover"
                            }`}
                          >
                            <span>{isDone ? "Baca Ulang" : "Baca Subbab"}</span>
                            <IconArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
