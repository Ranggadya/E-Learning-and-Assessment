"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconAward,
  IconCheckCircle,
  IconChevronRight,
  IconHistory,
  IconTrash,
} from "@/components/ui/Icons";
import { SUBTEST_KIND_LABEL } from "@/lib/assessment/constants";
import {
  computeDashboardStats,
  formatAttemptBadge,
  formatShortDate,
} from "@/lib/assessment/dashboard";
import { clearLocalProgress, useLocalProgress } from "@/lib/client/local-progress";
import type {
  AttemptBadge,
  DashboardCompany,
  DashboardSubtest,
} from "@/types/assessment";

interface HistoryProgressViewProps {
  catalog: DashboardCompany[];
}

const BADGE_TONE_CLASSES: Record<AttemptBadge["tone"], string> = {
  emerald:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300",
  amber:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300",
  red: "border-red-300 bg-red-50 text-red-800 dark:border-red-800/80 dark:bg-red-950/60 dark:text-red-300",
  blue: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800/80 dark:bg-blue-950/60 dark:text-blue-300",
};

export function HistoryProgressView({ catalog }: HistoryProgressViewProps) {
  const progress = useLocalProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelResetRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingResetRef = useRef(false);

  useEffect(() => {
    const wasConfirming = wasConfirmingResetRef.current;
    wasConfirmingResetRef.current = confirmingReset;

    if (!wasConfirming && confirmingReset) {
      cancelResetRef.current?.focus();
    } else if (wasConfirming && !confirmingReset) {
      resetTriggerRef.current?.focus();
    }
  }, [confirmingReset]);

  const stats = useMemo(
    () => computeDashboardStats(catalog, progress),
    [catalog, progress],
  );
  const completionPct =
    stats.totalSubtests > 0
      ? Math.min(100, Math.round((stats.completedSubtests / stats.totalSubtests) * 100))
      : 0;

  const subtestKindById = useMemo(() => {
    const map = new Map<number, DashboardSubtest>();
    for (const company of catalog) {
      for (const pkg of company.packages) {
        for (const subtest of pkg.subtests) {
          map.set(subtest.id, subtest);
        }
      }
    }
    return map;
  }, [catalog]);

  function handleConfirmReset() {
    clearLocalProgress();
    setConfirmingReset(false);
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
            Riwayat &amp; Progres Latihan
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Tersimpan lokal di browser ini tanpa akun. Klik sesi mana saja untuk membuka hasil dan pembahasan.
          </p>
        </div>

        {progress.recentAttempts.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            {confirmingReset ? (
              <>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-red-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-red-800"
                >
                  Hapus
                </button>
                <button
                  ref={cancelResetRef}
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-ink-secondary transition hover:bg-subtle hover:text-ink"
                >
                  Batal
                </button>
              </>
            ) : (
              <button
                ref={resetTriggerRef}
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/60"
              >
                <IconTrash className="h-3.5 w-3.5" />
                <span>Reset Riwayat Lokal</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* 3 KPI Summary Cards */}
      <section aria-label="Ringkasan progres lokal" className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none sm:p-5">
          <div className="flex items-center gap-3.5">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
            >
              <IconCheckCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-muted">Subtes Selesai</p>
              <p className="mt-0.5 truncate font-mono text-2xl font-extrabold tabular-nums text-ink">
                {stats.completedSubtests} / {stats.totalSubtests}
              </p>
            </div>
          </div>
          <div
            className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-subtle"
            role="progressbar"
            aria-valuenow={completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Persentase subtes selesai"
          >
            <div
              className="h-full rounded-full bg-brand transition-all duration-200"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none sm:p-5">
          <div className="flex items-center gap-3.5">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text"
            >
              <IconAward className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-muted">Rata-rata Skor Kuis</p>
              <p className="mt-0.5 truncate font-mono text-2xl font-extrabold tabular-nums text-ink">
                {stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : "—"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-muted">Khusus subtes pilihan ganda</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none sm:p-5">
          <div className="flex items-center gap-3.5">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-secondary"
            >
              <IconHistory className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-muted">Sesi Tersimpan</p>
              <p className="mt-0.5 truncate font-mono text-2xl font-extrabold tabular-nums text-ink">
                {progress.recentAttempts.length} sesi
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-muted">Hingga 24 sesi terakhir di browser ini</p>
        </div>
      </section>

      {/* Full Attempt History List */}
      {progress.recentAttempts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
          <IconHistory className="mx-auto h-8 w-8 text-ink-muted" />
          <h2 className="mt-3 text-base font-bold text-ink">Belum ada riwayat pengerjaan</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-secondary">
            Mulai kerjakan paket latihan apa saja. Skor, waktu selesai, dan pembahasan tiap sesi akan tercatat otomatis di browser ini.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-hover"
          >
            <span>Mulai Latihan</span>
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <section aria-labelledby="attempts-heading" className="space-y-3">
          <h2 id="attempts-heading" className="text-base font-bold tracking-tight text-ink">
            Daftar Riwayat Sesi
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
            {progress.recentAttempts.map((item) => {
              const kind = subtestKindById.get(item.subtestId)?.kind ?? "QUIZ";
              const badge = formatAttemptBadge(item, kind);
              const formattedDate = formatShortDate(item.completedAt);

              return (
                <li key={item.attemptId}>
                  <Link
                    href={`/result/${item.attemptId}`}
                    className="group flex flex-col gap-2 px-4 py-3.5 transition hover:bg-brand-soft/45 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-ink group-hover:text-brand-text">
                          {item.subtestName}
                        </span>
                        {kind !== "QUIZ" ? (
                          <span className="inline-flex items-center rounded border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-xs font-semibold text-brand-text">
                            {SUBTEST_KIND_LABEL[kind]}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {item.companyName} · {item.packageName}
                        {formattedDate ? ` · ${formattedDate}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums ${BADGE_TONE_CLASSES[badge.tone]}`}
                      >
                        {badge.label}
                      </span>
                      <IconChevronRight className="h-4 w-4 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand-text" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
