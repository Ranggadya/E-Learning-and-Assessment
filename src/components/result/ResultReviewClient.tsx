"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QuestionImage } from "@/components/QuestionImage";
import {
  IconArrowLeft,
  IconCheckCircle,
  IconChevronRight,
  IconMinusCircle,
  IconRotateCcw,
  IconXCircle,
} from "@/components/ui/Icons";
import { recordLocalAttempt } from "@/lib/local-progress";
import type { AttemptResult } from "@/lib/types";

type ReviewFilter = "all" | "wrong" | "blank" | "correct";

interface ResultReviewClientProps {
  result: AttemptResult;
}

export function ResultReviewClient({ result }: ResultReviewClientProps) {
  const [filter, setFilter] = useState<ReviewFilter>("all");

  // Simpan hasil ke riwayat lokal browser secara idempoten (berdasarkan attemptId).
  useEffect(() => {
    recordLocalAttempt({
      attemptId: result.attemptId,
      subtestId: result.subtestId,
      subtestName: result.subtestName,
      companySlug: result.companySlug,
      companyName: result.companyName,
      packageSlug: result.packageSlug,
      packageName: result.packageName,
      score: result.score,
      totalQuestions: result.totalQuestions,
      completedAt: result.finishedAt ?? new Date().toISOString(),
    });
  }, [result]);

  const counts = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    for (const item of result.reviewItems) {
      if (item.isCorrect) {
        correct += 1;
      } else if (item.selectedOption === null) {
        blank += 1;
      } else {
        wrong += 1;
      }
    }
    return {
      all: result.reviewItems.length,
      correct,
      wrong,
      blank,
    };
  }, [result.reviewItems]);

  const filteredItems = useMemo(() => {
    return result.reviewItems.filter((item) => {
      if (filter === "correct") {
        return item.isCorrect;
      }
      if (filter === "wrong") {
        return !item.isCorrect && item.selectedOption !== null;
      }
      if (filter === "blank") {
        return item.selectedOption === null;
      }
      return true;
    });
  }, [filter, result.reviewItems]);

  const accuracy =
    result.totalQuestions > 0 ? Math.round((result.score / result.totalQuestions) * 100) : 0;

  const filterTabs: { id: ReviewFilter; label: string; count: number }[] = [
    { id: "all", label: "Semua", count: counts.all },
    { id: "wrong", label: "Salah", count: counts.wrong },
    { id: "blank", label: "Kosong", count: counts.blank },
    { id: "correct", label: "Benar", count: counts.correct },
  ];

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="transition hover:text-ink">
          Dashboard
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <Link href={`/c/${result.companySlug}`} className="transition hover:text-ink">
          {result.companyName}
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <Link href={`/c/${result.companySlug}/${result.packageSlug}`} className="transition hover:text-ink">
          {result.packageName}
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">Hasil</span>
      </nav>

      {/* Score Summary Panel */}
      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Hasil: {result.subtestName}
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {result.companyName} · {result.packageName}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Aturan penilaian: benar +1, salah atau kosong 0, tanpa pengurangan nilai.
            </p>
          </div>

          <div className="flex items-baseline gap-4 rounded-xl border border-line bg-canvas px-5 py-4 sm:min-w-[200px] sm:justify-center">
            <div className="font-mono text-4xl font-bold tabular-nums text-brand-text">
              {result.score}
              <span className="text-xl font-medium text-ink-muted"> / {result.totalQuestions}</span>
            </div>
            <span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-sm font-semibold tabular-nums text-brand-text">
              {accuracy}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-line bg-subtle/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300">
              <IconCheckCircle className="h-3.5 w-3.5" />
              <span className="tabular-nums">Benar: {counts.correct}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-red-800 dark:border-red-800/80 dark:bg-red-950/60 dark:text-red-300">
              <IconXCircle className="h-3.5 w-3.5" />
              <span className="tabular-nums">Salah: {counts.wrong}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-ink-secondary">
              <IconMinusCircle className="h-3.5 w-3.5" />
              <span className="tabular-nums">Kosong: {counts.blank}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/c/${result.companySlug}/${result.packageSlug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
            >
              <IconArrowLeft className="h-4 w-4" />
              <span>Kembali ke Subtes</span>
            </Link>
            <Link
              href={`/test/${result.subtestId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              <IconRotateCcw className="h-4 w-4" />
              <span>Ulangi Subtes</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Review & Explanations */}
      <section aria-labelledby="review-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="review-heading" className="text-lg font-semibold text-ink">
            Pembahasan
          </h2>

          {result.reviewItems.length > 0 ? (
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
              {filterTabs.map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    aria-pressed={isActive}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      isActive
                        ? "bg-brand text-white"
                        : "text-ink-secondary hover:bg-subtle hover:text-ink"
                    }`}
                  >
                    {tab.label} <span className="font-mono tabular-nums opacity-80">({tab.count})</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {result.reviewItems.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-secondary">
            Detail jawaban dan pembahasan untuk pengerjaan ini tidak tersedia (kemungkinan soal pada subtes ini telah diperbarui oleh admin), namun skor akhirmu tetap tercatat.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-ink-secondary">
            Tidak ada soal pada kategori filter ini.
          </div>
        ) : (
          <ol className="space-y-4">
            {filteredItems.map((item) => {
              const selectedOption = item.options.find((option) => option.key === item.selectedOption);
              const correctOption = item.options.find((option) => option.key === item.correctOption);
              const isBlank = item.selectedOption === null;

              const statusBadge = item.isCorrect ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <IconCheckCircle className="h-3.5 w-3.5" />
                  Benar
                </span>
              ) : isBlank ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-line bg-subtle px-2.5 py-0.5 text-xs font-semibold text-ink-secondary">
                  <IconMinusCircle className="h-3.5 w-3.5" />
                  Tidak dijawab
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:border-red-800/80 dark:bg-red-950/60 dark:text-red-300">
                  <IconXCircle className="h-3.5 w-3.5" />
                  Salah
                </span>
              );

              return (
                <li
                  key={item.questionId}
                  className="rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                    <span className="font-mono text-xs font-semibold tabular-nums text-ink-muted">
                      Soal #{item.orderIndex}
                    </span>
                    {statusBadge}
                  </div>

                  <p className="mt-4 max-w-[70ch] whitespace-pre-line text-sm font-medium leading-relaxed text-ink sm:text-[15px]">
                    {item.prompt}
                  </p>

                  {item.imageSvg !== null ? <QuestionImage svgMarkup={item.imageSvg} /> : null}

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm">
                      <span className="block text-xs font-medium text-ink-muted">Jawabanmu</span>
                      <span
                        className={`mt-0.5 block font-semibold ${
                          item.isCorrect
                            ? "text-emerald-700 dark:text-emerald-300"
                            : isBlank
                              ? "text-ink-muted"
                              : "text-red-700 dark:text-red-300"
                        }`}
                      >
                        {selectedOption ? `${selectedOption.key}. ${selectedOption.label}` : "Tidak dijawab"}
                      </span>
                    </div>

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-sm dark:border-emerald-900/70 dark:bg-emerald-950/40">
                      <span className="block text-xs font-medium text-emerald-800 dark:text-emerald-300">
                        Jawaban Benar
                      </span>
                      <span className="mt-0.5 block font-semibold text-emerald-900 dark:text-emerald-100">
                        {correctOption ? `${correctOption.key}. ${correctOption.label}` : item.correctOption}
                      </span>
                    </div>
                  </div>

                  {item.explanation ? (
                    <div className="mt-3.5 rounded-lg bg-subtle px-4 py-3 text-sm leading-relaxed text-ink-secondary">
                      <span className="font-semibold text-ink">Pembahasan: </span>
                      <span className="whitespace-pre-line">{item.explanation}</span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
