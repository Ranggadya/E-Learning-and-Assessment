"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconCheckCircle,
  IconChevronRight,
  IconClock,
  IconRotateCcw,
} from "@/components/ui/Icons";
import { QuestionTypeBadge } from "@/components/ui/QuestionTypeBadge";
import { SUBTEST_KIND_LABEL, SUBTEST_UNIT } from "@/lib/assessment/constants";
import { useLocalProgress } from "@/lib/client/local-progress";
import type { Company, Subtest, TestPackage } from "@/types/assessment";

interface PackageSubtestsViewProps {
  company: Company;
  testPackage: TestPackage;
  subtests: Subtest[];
}

export function PackageSubtestsView({ company, testPackage, subtests }: PackageSubtestsViewProps) {
  const progress = useLocalProgress();

  const totalDurationMinutes = Math.max(
    1,
    Math.round(subtests.reduce((acc, s) => acc + s.durationSeconds, 0) / 60),
  );
  const completedCount = subtests.filter((s) => Boolean(progress.bySubtestId[String(s.id)])).length;
  const percent = subtests.length > 0 ? Math.round((completedCount / subtests.length) * 100) : 0;
  const nextUnfinishedSubtestId =
    subtests.find((s) => s.questionCount > 0 && !progress.bySubtestId[String(s.id)])?.id ?? null;

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="transition hover:text-ink">
          Dashboard
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <Link href={`/c/${company.slug}`} className="transition hover:text-ink">
          {company.name}
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">{testPackage.name}</span>
      </nav>

      {/* Package Header & Progress Bar */}
      <section className="rounded-[10px] border border-line-strong bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {company.name} · {testPackage.name}
            </h1>
            {testPackage.description ? (
              <p className="mt-1.5 max-w-[65ch] text-sm text-ink-secondary">{testPackage.description}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span className="tabular-nums">{subtests.length} subtes</span>
              <span className="tabular-nums">{testPackage.questionCount} soal</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <IconClock className="h-3.5 w-3.5" />
                Total estimasi ~{totalDurationMinutes} menit
              </span>
            </div>
          </div>

          <div className="w-full sm:w-52">
            <div className="flex items-center justify-between text-xs tabular-nums">
              <span className="font-medium text-ink-secondary">Progres paket</span>
              <span className="font-mono font-semibold text-ink">
                {completedCount}/{subtests.length} ({percent}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-[3px] bg-subtle">
              <div
                className="h-full rounded-[3px] bg-brand transition-all duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Subtest List */}
      <section aria-labelledby="subtests-heading" className="space-y-3">
        <h2 id="subtests-heading" className="text-base font-semibold text-ink">
          Daftar Subtes
        </h2>

        {subtests.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong bg-surface p-8 text-center text-sm text-ink-secondary">
            Paket ini belum memiliki subtes.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <ol className="divide-y divide-line">
              {subtests.map((subtest, index) => {
                const durationMinutes = Math.max(1, Math.round(subtest.durationSeconds / 60));
                const localRecord = progress.bySubtestId[String(subtest.id)];
                const isDone = Boolean(localRecord);
                const isNextRecommended = subtest.id === nextUnfinishedSubtestId;
                const specialTypes = subtest.questionTypes.filter((t) => t !== "TEXT");
                const displayTypes = specialTypes.length > 0 ? specialTypes : subtest.questionTypes;

                return (
                  <li
                    key={subtest.id}
                    className="flex flex-col gap-4 p-4 transition hover:bg-subtle/50 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
                  >
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums ${
                          isDone
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : isNextRecommended
                              ? "bg-brand-soft text-brand-text"
                              : "bg-subtle text-ink-secondary"
                        }`}
                      >
                        {isDone ? <IconCheckCircle className="h-4 w-4" /> : index + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ink">{subtest.name}</h3>
                          {subtest.kind !== "QUIZ" ? (
                            <span className="inline-flex items-center rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-text">
                              {SUBTEST_KIND_LABEL[subtest.kind]}
                            </span>
                          ) : (
                            displayTypes.map((type) => <QuestionTypeBadge key={type} type={type} />)
                          )}
                        </div>
                        {subtest.description ? (
                          <p className="mt-1 max-w-[60ch] text-sm text-ink-secondary">{subtest.description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                          <span className="tabular-nums">
                            {subtest.questionCount} {SUBTEST_UNIT[subtest.kind]}
                          </span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <IconClock className="h-3.5 w-3.5" />
                            {durationMinutes} menit
                          </span>
                          {localRecord ? (
                            <Link
                              href={`/result/${localRecord.lastAttemptId}`}
                              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                            >
                              <span className="font-mono tabular-nums">
                                Terakhir: {localRecord.lastScore}/{localRecord.totalQuestions}
                              </span>
                              {localRecord.attemptsCount > 1 ? (
                                <span className="text-ink-muted">
                                  (Terbaik:{" "}
                                  <span className="font-mono tabular-nums">
                                    {localRecord.bestScore}/{localRecord.totalQuestions}
                                  </span>
                                  )
                                </span>
                              ) : null}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                      {subtest.questionCount > 0 ? (
                        <Link
                          href={`/test/${subtest.id}`}
                          className={
                            isNextRecommended
                              ? "inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover sm:w-auto"
                              : "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle sm:w-auto"
                          }
                        >
                          {isDone ? (
                            <>
                              <IconRotateCcw className="h-3.5 w-3.5" />
                              <span>Ulangi</span>
                            </>
                          ) : (
                            <>
                              <span>Mulai</span>
                              <IconArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Link>
                      ) : (
                        <span className="text-xs font-medium text-ink-muted">Belum ada soal</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
