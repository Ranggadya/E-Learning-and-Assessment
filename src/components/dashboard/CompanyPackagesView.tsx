"use client";

import Link from "next/link";
import { IconArrowRight, IconChevronRight, IconClock, IconLayers } from "@/components/ui/Icons";
import { useLocalProgress } from "@/lib/client/local-progress";
import type { DashboardCompany } from "@/types/assessment";

interface CompanyPackagesViewProps {
  company: DashboardCompany;
}

export function CompanyPackagesView({ company }: CompanyPackagesViewProps) {
  const progress = useLocalProgress();

  const totalSubtests = company.packages.reduce((acc, pkg) => acc + pkg.subtests.length, 0);
  const completedSubtests = company.packages.reduce(
    (acc, pkg) => acc + pkg.subtests.filter((s) => Boolean(progress.bySubtestId[String(s.id)])).length,
    0,
  );
  const totalQuestions = company.packages.reduce(
    (acc, pkg) =>
      acc + pkg.subtests.reduce((subAcc, s) => subAcc + (s.kind === "QUIZ" ? s.questionCount : 0), 0),
    0,
  );
  // Single Primary Action Rule: sorot hanya satu paket belum tuntas berikutnya sebagai CTA primer.
  const primaryPackageId =
    company.packages.find(
      (pkg) =>
        pkg.subtests.length > 0 &&
        pkg.subtests.some((s) => s.questionCount > 0 && !progress.bySubtestId[String(s.id)]),
    )?.id ??
    company.packages[0]?.id ??
    null;

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="transition hover:text-ink">
          Dashboard
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">{company.name}</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
            {company.name}
          </h1>
          {company.description ? (
            <p className="mt-1.5 max-w-[65ch] text-sm text-ink-secondary">{company.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
          <span className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium tabular-nums">
            {company.packages.length} paket
          </span>
          <span className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium tabular-nums">
            {totalQuestions} soal
          </span>
          <span className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-brand-text">
            <span className="font-mono tabular-nums">
              {completedSubtests}/{totalSubtests}
            </span>{" "}
            subtes selesai
          </span>
        </div>
      </div>

      {company.packages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
          <IconLayers className="mx-auto h-7 w-7 text-ink-muted" />
          <p className="mt-2 text-sm text-ink-secondary">Belum ada paket latihan untuk perusahaan ini.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <ul className="divide-y divide-line">
            {company.packages.map((pkg) => {
              const subtestCount = pkg.subtests.length;
              const questionCount = pkg.subtests.reduce(
                (acc, s) => acc + (s.kind === "QUIZ" ? s.questionCount : 0),
                0,
              );
              const totalMinutes = Math.max(
                1,
                Math.round(pkg.subtests.reduce((acc, s) => acc + s.durationSeconds, 0) / 60),
              );
              const doneCount = pkg.subtests.filter((s) => Boolean(progress.bySubtestId[String(s.id)])).length;
              const percent = subtestCount > 0 ? Math.round((doneCount / subtestCount) * 100) : 0;
              const isPrimaryPackage = pkg.id === primaryPackageId;

              return (
                <li key={pkg.id} className="p-5 transition hover:bg-subtle/50">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/c/${company.slug}/${pkg.slug}`}
                          className="text-lg font-semibold text-ink transition hover:text-brand-text"
                        >
                          {pkg.name}
                        </Link>
                        {doneCount === subtestCount && subtestCount > 0 ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Semua subtes selesai
                          </span>
                        ) : null}
                      </div>
                      {pkg.description ? (
                        <p className="mt-1 max-w-[65ch] text-sm text-ink-secondary">{pkg.description}</p>
                      ) : null}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                        <span className="tabular-nums">{subtestCount} subtes</span>
                        <span className="tabular-nums">{questionCount} soal</span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <IconClock className="h-3.5 w-3.5" />
                          Total estimasi ~{totalMinutes} menit
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:w-56 sm:items-end">
                      <div className="w-full">
                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className="text-ink-muted">Progres lokal</span>
                          <span className="font-mono font-medium text-ink">
                            {doneCount}/{subtestCount} ({percent}%)
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-[3px] bg-subtle">
                          <div
                            className="h-full rounded-[3px] bg-brand transition-all duration-200"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                      <Link
                        href={`/c/${company.slug}/${pkg.slug}`}
                        className={
                          isPrimaryPackage
                            ? "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover sm:w-auto"
                            : "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle sm:w-auto"
                        }
                      >
                        <span>Lihat Subtes</span>
                        <IconArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
