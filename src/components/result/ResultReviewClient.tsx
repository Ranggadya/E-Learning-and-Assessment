"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QuestionImage } from "@/components/test/QuestionImage";
import {
  IconArrowLeft,
  IconCheckCircle,
  IconChevronRight,
  IconMinusCircle,
  IconRotateCcw,
  IconXCircle,
} from "@/components/ui/Icons";
import { recordLocalAttempt } from "@/lib/client/local-progress";
import type { AttemptResult } from "@/types/assessment";

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

  if (result.subtestKind !== "QUIZ" && result.result) {
    const nonQuiz = result.result;
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

        <section className="overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">Hasil: {result.subtestName}</h1>
              <p className="mt-1 text-sm text-ink-secondary">
                {result.companyName} · {result.packageName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/c/${result.companySlug}/${result.packageSlug}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                <IconArrowLeft className="h-4 w-4" />
                <span>Kembali ke Subtes</span>
              </Link>
              <Link
                href={`/test/${result.subtestId}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                <IconRotateCcw className="h-4 w-4" />
                <span>Ulangi Subtes</span>
              </Link>
            </div>
          </div>
        </section>

        {nonQuiz.kind === "PERSONALITY" ? (
          <section className="space-y-4">
            <p className="text-sm text-ink-secondary">
              Terjawab <strong className="text-ink tabular-nums">{nonQuiz.answered}/{nonQuiz.total}</strong> pernyataan.
              Hasil ini adalah gambaran kecenderungan sikap kerja, bukan nilai benar atau salah.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {nonQuiz.traits.map((trait) => (
                <div
                  key={trait.key}
                  className="rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-ink">{trait.name}</h2>
                    <span className="shrink-0 rounded-md bg-brand-soft px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-brand-text">
                      {trait.level} ({trait.percent}%)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{trait.description}</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-subtle">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${trait.percent}%` }} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{trait.meaning}</p>
                </div>
              ))}
            </div>
          </section>
        ) : nonQuiz.kind === "PAULI" ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
                <span className="text-xs text-ink-muted">Total Dijawab</span>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{nonQuiz.totalAnswered}</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
                <span className="text-xs text-ink-muted">Jawaban Benar</span>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {nonQuiz.totalCorrect}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
                <span className="text-xs text-ink-muted">Ketelitian</span>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-brand-text">{nonQuiz.accuracy}%</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-canvas text-xs text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5">Kolom</th>
                    <th className="px-4 py-2.5">Dijawab</th>
                    <th className="px-4 py-2.5">Benar</th>
                    <th className="px-4 py-2.5">Akurasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono tabular-nums">
                  {nonQuiz.perColumn.map((col) => {
                    const colAcc = col.answered > 0 ? Math.round((col.correct / col.answered) * 100) : 0;
                    return (
                      <tr key={col.column}>
                        <td className="px-4 py-2.5 font-semibold text-ink">Kolom {col.column}</td>
                        <td className="px-4 py-2.5 text-ink-secondary">{col.answered}</td>
                        <td className="px-4 py-2.5 text-emerald-700 dark:text-emerald-300">{col.correct}</td>
                        <td className="px-4 py-2.5 text-ink-secondary">{colAcc}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {nonQuiz.drawings.map((item) => (
                <div key={item.key} className="overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
                  <h2 className="text-sm font-semibold text-ink">{item.title}</h2>
                  <p className="mt-0.5 text-xs text-ink-muted">{item.instruction}</p>
                  {item.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.dataUrl}
                      alt={item.title}
                      className="mt-3 w-full rounded-xl border border-line bg-white"
                    />
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-muted">
                      Tidak ada gambar
                    </div>
                  )}
                </div>
              ))}
            </div>

            {nonQuiz.reflection.length > 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
                <h2 className="text-base font-semibold text-ink">Daftar Refleksi Mandiri</h2>
                <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
                  {nonQuiz.reflection.map((item, idx) => (
                    <li key={idx}>
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-line-strong accent-brand" />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        )}
      </div>
    );
  }

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
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              Hasil: {result.subtestName}
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {result.companyName} · {result.packageName}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Aturan penilaian: benar +1, salah atau kosong 0, tanpa pengurangan nilai.
            </p>
          </div>

          <div className="flex items-baseline gap-4 rounded-xl bg-canvas px-5 py-4 sm:min-w-[200px] sm:justify-center">
            <div className="font-mono text-4xl font-bold tabular-nums text-brand-text">
              {result.score}
              <span className="text-xl font-medium text-ink-muted"> / {result.totalQuestions}</span>
            </div>
            <span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-sm font-semibold tabular-nums text-brand-text">
              {accuracy}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-line bg-canvas/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium">
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
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
            >
              <IconArrowLeft className="h-4 w-4" />
              <span>Kembali ke Subtes</span>
            </Link>
            <Link
              href={`/test/${result.subtestId}`}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
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
          <h2 id="review-heading" className="text-lg font-bold text-ink">
            Pembahasan
          </h2>

          {result.reviewItems.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    aria-pressed={isActive}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "border-brand/40 bg-brand-soft text-brand-text"
                        : "border-line bg-surface text-ink-secondary hover:bg-subtle hover:text-ink"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="font-mono tabular-nums opacity-80">({tab.count})</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {result.reviewItems.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-6 text-sm text-ink-secondary">
            Detail jawaban dan pembahasan untuk pengerjaan ini tidak tersedia (kemungkinan soal pada subtes ini telah diperbarui oleh admin), namun skor akhirmu tetap tercatat.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-ink-secondary">
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
                  className="rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none sm:p-6"
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
                    <div className="rounded-xl bg-canvas px-4 py-3 text-sm">
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

                    <div className="rounded-xl bg-emerald-50/70 px-4 py-3 text-sm dark:bg-emerald-950/35">
                      <span className="block text-xs font-medium text-emerald-800 dark:text-emerald-300">
                        Jawaban Benar
                      </span>
                      <span className="mt-0.5 block font-semibold text-emerald-900 dark:text-emerald-100">
                        {correctOption ? `${correctOption.key}. ${correctOption.label}` : item.correctOption}
                      </span>
                    </div>
                  </div>

                  {item.explanation ? (
                    <div className="mt-3.5 rounded-xl bg-canvas px-4 py-3 text-sm leading-relaxed text-ink-secondary">
                      <span className="font-semibold text-ink">Pembahasan: </span>
                      <span className="whitespace-pre-line">{item.explanation}</span>
                    </div>
                  ) : null}

                  {item.steps && item.steps.length > 0 ? (
                    <div className="mt-3.5 max-w-[70ch] text-sm">
                      <p className="font-semibold text-ink">Langkah pengerjaan</p>
                      <ol className="mt-1 list-decimal space-y-1 pl-5 text-ink-secondary">
                        {item.steps.map((step, stepIndex) => (
                          <li key={stepIndex}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {item.wrongNotes &&
                    item.wrongNotes.some(
                      (note, noteIndex) => note.trim() !== "" && item.options[noteIndex]?.key !== item.correctOption,
                    ) ? (
                    <div className="mt-3.5 max-w-[70ch] text-sm">
                      <p className="font-semibold text-ink">Kenapa opsi lain kurang tepat</p>
                      <ul className="mt-1 space-y-1 text-ink-secondary">
                        {item.options.map((option, noteIndex) => {
                          const note = item.wrongNotes?.[noteIndex] ?? "";
                          if (note.trim() === "" || option.key === item.correctOption) {
                            return null;
                          }
                          return (
                            <li key={option.key}>
                              <strong className="text-ink">{option.key}.</strong> {note}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {item.quickTip ? (
                    <p className="mt-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-200">
                      <strong className="font-semibold">Tips cepat:</strong> {item.quickTip}
                    </p>
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
