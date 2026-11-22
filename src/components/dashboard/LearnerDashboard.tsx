"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconChevronRight,
  IconClock,
  IconLayers,
  IconSearch,
} from "@/components/ui/Icons";
import {
  computeDashboardStats,
  computeNextAction,
  getCompanyMonogram,
  getPackageKindChips,
  selectCompanyPackages,
} from "@/lib/dashboard-helpers";
import { useLocalProgress } from "@/lib/local-progress";
import type { DashboardCompany } from "@/lib/types";

interface LearnerDashboardProps {
  catalog: DashboardCompany[];
}

function filterCatalog(catalog: DashboardCompany[], trimmedLowerQuery: string): DashboardCompany[] {
  if (!trimmedLowerQuery) {
    return catalog;
  }

  return catalog
    .map((company) => {
      const companyMatches =
        company.name.toLowerCase().includes(trimmedLowerQuery) ||
        (company.description ?? "").toLowerCase().includes(trimmedLowerQuery);
      if (companyMatches) {
        return company;
      }

      const matchingPackages = company.packages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(trimmedLowerQuery) ||
          (pkg.description ?? "").toLowerCase().includes(trimmedLowerQuery) ||
          pkg.subtests.some((s) => s.name.toLowerCase().includes(trimmedLowerQuery)),
      );
      return matchingPackages.length > 0 ? { ...company, packages: matchingPackages } : null;
    })
    .filter((item): item is DashboardCompany => item !== null);
}

export function LearnerDashboard({ catalog }: LearnerDashboardProps) {
  const progress = useLocalProgress();
  const [query, setQuery] = useState("");

  const stats = useMemo(() => computeDashboardStats(catalog, progress), [catalog, progress]);
  const nextAction = useMemo(() => computeNextAction(catalog, progress), [catalog, progress]);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const filteredCatalog = useMemo(
    () => filterCatalog(catalog, trimmedQuery.toLowerCase()),
    [catalog, trimmedQuery],
  );

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Block 1: Top Header + Inline Search Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]">
            Dashboard Latihan
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Pilih perusahaan dan paket tes untuk langsung berlatih dengan timer otomatis dan pembahasan lengkap.
          </p>
        </div>

        {catalog.length > 0 ? (
          <div className="relative w-full shrink-0 sm:w-72">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari perusahaan, paket, atau subtes..."
              aria-label="Cari perusahaan, paket, atau subtes"
              className="w-full sm:w-72 rounded-lg border border-line-strong bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      {/* Block 2: Solid Cobalt Focus Hero Banner */}
      {nextAction !== null ? (
        <section
          aria-label="Fokus latihan berikutnya"
          className="rounded-[10px] bg-brand p-5 text-white shadow-[0_6px_18px_rgba(29,78,216,0.22)] dark:shadow-none sm:p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-white/18 text-white">
                {nextAction.tag}
              </span>
              <h2 className="mt-2 text-lg font-extrabold tracking-tight text-white sm:text-xl">
                {nextAction.title}
              </h2>
              <p className="mt-1 text-sm text-blue-100">{nextAction.meta}</p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:shrink-0 lg:justify-end">
              <div className="border-t border-white/25 pt-3.5 sm:border-t-0 sm:pt-0 lg:border-r lg:border-white/25 lg:pr-5 lg:text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                  Progres Lokal
                </p>
                <p className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-white">
                  {stats.completedSubtests}/{stats.totalSubtests}
                  {stats.avgAccuracy !== null ? (
                    <span className="text-sm font-semibold text-blue-100"> · {stats.avgAccuracy}%</span>
                  ) : null}
                </p>
                <Link
                  href="/riwayat"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-white underline decoration-white/60 underline-offset-4 hover:decoration-white focus-visible:outline-white"
                >
                  Buka Riwayat →
                </Link>
              </div>

              <Link
                href={nextAction.href}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-deep shadow-xs transition hover:bg-blue-50 focus-visible:outline-white"
              >
                <span>{nextAction.ctaLabel}</span>
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Block 3: Full-Width 2-Column Company Catalog Grid */}
      <section aria-labelledby="catalog-heading" className="space-y-4">
        <h2 id="catalog-heading" className="text-base font-bold tracking-tight text-ink">
          Paket Tes Perusahaan
        </h2>

        {catalog.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong bg-surface p-8 text-center">
            <IconLayers className="mx-auto h-8 w-8 text-ink-muted" />
            <h3 className="mt-3 text-base font-bold text-ink">Belum ada paket soal</h3>
            <p className="mt-1 text-sm text-ink-secondary">
              Unggah file paket soal berformat JSON melalui halaman CMS Admin untuk mulai berlatih.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-hover"
            >
              Buka CMS Admin
            </Link>
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="rounded-[10px] border border-line-strong bg-surface p-8 text-center">
            <p className="text-sm font-medium text-ink-secondary">
              Tidak ada perusahaan, paket, atau subtes yang cocok dengan kata kunci &ldquo;{trimmedQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 inline-flex items-center justify-center rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-subtle"
            >
              Reset pencarian
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            {filteredCatalog.map((company) => {
              const companyTotalSubtests = company.packages.reduce(
                (acc, pkg) => acc + pkg.subtests.length,
                0,
              );
              const companyCompleted = company.packages.reduce(
                (acc, pkg) =>
                  acc + pkg.subtests.filter((s) => Boolean(progress.bySubtestId[String(s.id)])).length,
                0,
              );
              const { visible, hiddenCount } = selectCompanyPackages(
                company.packages,
                progress,
                isSearching,
                4,
              );

              return (
                <article
                  key={company.id}
                  className="overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-none"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-line bg-subtle/75 px-4 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-deep text-xs font-extrabold tracking-tight text-white"
                      >
                        {getCompanyMonogram(company.name)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/c/${company.slug}`}
                          className="block truncate text-sm font-extrabold text-ink transition hover:text-brand-text"
                        >
                          {company.name}
                        </Link>
                        <p className="truncate text-xs font-medium text-ink-secondary tabular-nums">
                          {company.packages.length} paket · {companyCompleted}/{companyTotalSubtests} subtes selesai
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/c/${company.slug}`}
                      className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-brand-text hover:underline"
                    >
                      <span>Semua</span>
                      <IconChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {company.packages.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-ink-muted">
                      Belum ada paket pada perusahaan ini.
                    </p>
                  ) : (
                    <>
                      <ul className="divide-y divide-line">
                        {visible.map((pkg) => {
                          const totalSub = pkg.subtests.length;
                          const totalQ = pkg.subtests.reduce(
                            (acc, s) => acc + (s.kind === "QUIZ" ? s.questionCount : 0),
                            0,
                          );
                          const totalMinutes = Math.max(
                            1,
                            Math.round(
                              pkg.subtests.reduce((acc, s) => acc + Math.max(0, s.durationSeconds), 0) /
                                60,
                            ),
                          );
                          const doneSub = pkg.subtests.filter((s) =>
                            Boolean(progress.bySubtestId[String(s.id)]),
                          ).length;
                          const percent =
                            totalSub > 0 ? Math.min(100, Math.round((doneSub / totalSub) * 100)) : 0;
                          const kindChips = getPackageKindChips(pkg.subtests);

                          return (
                            <li key={pkg.id}>
                              <Link
                                href={`/c/${company.slug}/${pkg.slug}`}
                                className="group flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-brand-soft/50"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-bold text-ink group-hover:text-brand-text">
                                      {pkg.name}
                                    </span>
                                    {doneSub === totalSub && totalSub > 0 ? (
                                      <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        Lengkap
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                                    {kindChips.map((chip, index) => (
                                      <span
                                        key={chip}
                                        className={
                                          index === 0
                                            ? "rounded border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand-text"
                                            : "rounded border border-line bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-ink-secondary"
                                        }
                                      >
                                        {chip}
                                      </span>
                                    ))}
                                    {totalQ > 0 ? <span className="tabular-nums">{totalQ} soal</span> : null}
                                    <span className="inline-flex items-center gap-1 tabular-nums">
                                      <IconClock className="h-3.5 w-3.5" />
                                      ~{totalMinutes} mnt
                                    </span>
                                  </div>
                                </div>

                                <div className="w-20 shrink-0">
                                  <div
                                    className={`text-right font-mono text-xs font-bold tabular-nums ${
                                      doneSub > 0 ? "text-brand-text" : "text-ink-muted"
                                    }`}
                                  >
                                    {doneSub}/{totalSub}
                                  </div>
                                  <div
                                    className="mt-1.5 h-1.5 w-full overflow-hidden rounded-[3px] bg-subtle"
                                    aria-hidden="true"
                                  >
                                    <div
                                      className="h-full rounded-[3px] bg-brand transition-all duration-200"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>

                      {hiddenCount > 0 ? (
                        <Link
                          href={`/c/${company.slug}`}
                          className="flex items-center justify-between border-t border-line bg-subtle/40 px-4 py-2.5 text-xs font-bold text-brand-text transition hover:bg-brand-soft/60"
                        >
                          <span>Lihat {hiddenCount} paket lainnya</span>
                          <IconArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
