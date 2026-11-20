"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconChevronRight,
  IconClock,
  IconLayers,
  IconSearch,
  IconTrash,
} from "@/components/ui/Icons";
import { clearLocalProgress, useLocalProgress } from "@/lib/local-progress";
import type { DashboardCompany } from "@/lib/types";

interface LearnerDashboardProps {
  catalog: DashboardCompany[];
}

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function computeNextAction(
  catalog: DashboardCompany[],
  progress: ReturnType<typeof useLocalProgress>,
): { href: string; label: string; detail: string } | null {
  // Cari subtes berikutnya yang belum dikerjakan dari paket terakhir yang dipakai peserta.
  const latestAttempt = progress.recentAttempts[0];
  if (latestAttempt) {
    const company = catalog.find((c) => c.slug === latestAttempt.companySlug);
    const pkg = company?.packages.find((p) => p.slug === latestAttempt.packageSlug);
    if (company && pkg) {
      const nextUnfinished = pkg.subtests.find(
        (s) => s.questionCount > 0 && !progress.bySubtestId[String(s.id)],
      );
      if (nextUnfinished) {
        return {
          href: `/test/${nextUnfinished.id}`,
          label: "Lanjutkan Latihan",
          detail: `${company.name} · ${pkg.name} — ${nextUnfinished.name}`,
        };
      }
      return {
        href: `/c/${company.slug}/${pkg.slug}`,
        label: "Buka Paket Terakhir",
        detail: `${company.name} · ${pkg.name}`,
      };
    }
  }

  // Jika belum ada riwayat, arahkan ke subtes pertama yang tersedia.
  for (const company of catalog) {
    for (const pkg of company.packages) {
      const firstSubtest = pkg.subtests.find((s) => s.questionCount > 0);
      if (firstSubtest) {
        return {
          href: `/c/${company.slug}/${pkg.slug}`,
          label: "Mulai Latihan",
          detail: `${company.name} · ${pkg.name}`,
        };
      }
    }
  }
  return null;
}

export function LearnerDashboard({ catalog }: LearnerDashboardProps) {
  const progress = useLocalProgress();
  const [query, setQuery] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const stats = useMemo(() => {
    let totalPackages = 0;
    let totalSubtests = 0;
    let completedSubtests = 0;
    let totalQuestions = 0;
    let scoreRatioSum = 0;
    let scoreRatioCount = 0;

    for (const company of catalog) {
      totalPackages += company.packages.length;
      for (const pkg of company.packages) {
        totalSubtests += pkg.subtests.length;
        for (const subtest of pkg.subtests) {
          totalQuestions += subtest.questionCount;
          const record = progress.bySubtestId[String(subtest.id)];
          if (record) {
            completedSubtests += 1;
            if (record.totalQuestions > 0) {
              scoreRatioSum += record.lastScore / record.totalQuestions;
              scoreRatioCount += 1;
            }
          }
        }
      }
    }

    const avgAccuracy = scoreRatioCount > 0 ? Math.round((scoreRatioSum / scoreRatioCount) * 100) : null;
    return {
      totalCompanies: catalog.length,
      totalPackages,
      totalSubtests,
      totalQuestions,
      completedSubtests,
      avgAccuracy,
    };
  }, [catalog, progress]);

  const nextAction = computeNextAction(catalog, progress);

  const filteredCatalog = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return catalog;
    }
    return catalog
      .map((company) => {
        const companyMatches =
          company.name.toLowerCase().includes(trimmed) ||
          (company.description ?? "").toLowerCase().includes(trimmed);
        if (companyMatches) {
          return company;
        }
        const matchingPackages = company.packages.filter(
          (pkg) =>
            pkg.name.toLowerCase().includes(trimmed) ||
            (pkg.description ?? "").toLowerCase().includes(trimmed) ||
            pkg.subtests.some((s) => s.name.toLowerCase().includes(trimmed)),
        );
        return matchingPackages.length > 0 ? { ...company, packages: matchingPackages } : null;
      })
      .filter((item): item is DashboardCompany => item !== null);
  }, [catalog, query]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            Dashboard Latihan
          </h1>
          <p className="mt-1.5 max-w-[65ch] text-sm text-ink-secondary">
            Pilih perusahaan dan paket tes untuk berlatih dengan timer otomatis, penilaian di server, dan pembahasan lengkap.
          </p>
        </div>

        {nextAction ? (
          <Link
            href={nextAction.href}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-hover"
          >
            <span>{nextAction.label}</span>
            <IconArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      {/* Unified Summary Strip */}
      <section aria-label="Ringkasan statistik latihan" className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <dl className="grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="p-4 sm:px-5 sm:py-4">
            <dt className="text-xs font-medium text-ink-muted">Perusahaan</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">
              {stats.totalCompanies}
            </dd>
          </div>
          <div className="border-l border-line p-4 sm:border-l-0 sm:px-5 sm:py-4">
            <dt className="text-xs font-medium text-ink-muted">Paket &amp; Bank Soal</dt>
            <dd className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-ink">
                {stats.totalPackages}
              </span>
              <span className="text-xs text-ink-muted tabular-nums">({stats.totalQuestions} soal)</span>
            </dd>
          </div>
          <div className="p-4 sm:px-5 sm:py-4">
            <dt className="text-xs font-medium text-ink-muted">Subtes Selesai</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-brand-text">
                {stats.completedSubtests}
              </span>
              <span className="text-sm font-medium tabular-nums text-ink-muted">
                / {stats.totalSubtests}
              </span>
            </dd>
          </div>
          <div className="border-l border-line p-4 sm:border-l-0 sm:px-5 sm:py-4">
            <dt className="text-xs font-medium text-ink-muted">Rata-rata Skor</dt>
            <dd className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">
              {stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Main Content Two-Column Split */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        {/* Left: Companies & Packages */}
        <section aria-labelledby="catalog-heading" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="catalog-heading" className="text-lg font-semibold text-ink">
              Paket Tes Perusahaan
            </h2>
            {catalog.length > 0 ? (
              <div className="relative w-full sm:w-72">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari perusahaan atau paket..."
                  aria-label="Cari perusahaan, paket, atau subtes"
                  className="w-full rounded-lg border border-line bg-surface py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition focus:border-brand focus:outline-none"
                />
              </div>
            ) : null}
          </div>

          {catalog.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
              <IconLayers className="mx-auto h-8 w-8 text-ink-muted" />
              <h3 className="mt-3 text-base font-semibold text-ink">Belum ada paket soal</h3>
              <p className="mt-1 text-sm text-ink-secondary">
                Unggah file paket soal berformat JSON melalui halaman CMS Admin untuk mulai berlatih.
              </p>
              <Link
                href="/admin"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                Buka CMS Admin
              </Link>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-ink-secondary">
              Tidak ada perusahaan atau paket yang cocok dengan kata kunci &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCatalog.map((company) => {
                const companyTotalSubtests = company.packages.reduce((acc, p) => acc + p.subtests.length, 0);
                const companyCompleted = company.packages.reduce(
                  (acc, p) => acc + p.subtests.filter((s) => Boolean(progress.bySubtestId[String(s.id)])).length,
                  0,
                );
                return (
                  <article
                    key={company.id}
                    className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <Link
                            href={`/c/${company.slug}`}
                            className="text-base font-semibold text-ink transition hover:text-brand-text"
                          >
                            {company.name}
                          </Link>
                          <span className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-ink-secondary">
                            <span className="font-mono tabular-nums">
                              {companyCompleted}/{companyTotalSubtests}
                            </span>{" "}
                            subtes
                          </span>
                        </div>
                        {company.description ? (
                          <p className="mt-1 text-sm text-ink-secondary">{company.description}</p>
                        ) : null}
                      </div>
                      <Link
                        href={`/c/${company.slug}`}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-text hover:underline"
                      >
                        <span>Semua paket</span>
                        <IconChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {company.packages.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-ink-muted">Belum ada paket pada perusahaan ini.</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {company.packages.map((pkg) => {
                          const totalSub = pkg.subtests.length;
                          const totalQ = pkg.subtests.reduce((acc, s) => acc + s.questionCount, 0);
                          const totalMinutes = Math.max(
                            1,
                            Math.round(pkg.subtests.reduce((acc, s) => acc + s.durationSeconds, 0) / 60),
                          );
                          const doneSub = pkg.subtests.filter((s) => Boolean(progress.bySubtestId[String(s.id)])).length;
                          const percent = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;

                          return (
                            <li key={pkg.id}>
                              <Link
                                href={`/c/${company.slug}/${pkg.slug}`}
                                className="group flex flex-col gap-3 px-5 py-4 transition hover:bg-subtle/60 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-ink group-hover:text-brand-text">
                                      {pkg.name}
                                    </span>
                                    {doneSub === totalSub && totalSub > 0 ? (
                                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        Lengkap
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                                    <span className="tabular-nums">{totalSub} subtes</span>
                                    <span className="tabular-nums">{totalQ} soal</span>
                                    <span className="inline-flex items-center gap-1 tabular-nums">
                                      <IconClock className="h-3.5 w-3.5" />
                                      ~{totalMinutes} menit
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 sm:w-44 sm:justify-end">
                                  <div className="flex-1 sm:w-28 sm:flex-none">
                                    <div className="flex items-center justify-between text-xs tabular-nums">
                                      <span className="text-ink-muted">Progres</span>
                                      <span className="font-mono font-medium text-ink-secondary">
                                        {doneSub}/{totalSub}
                                      </span>
                                    </div>
                                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                                      <div
                                        className="h-full rounded-full bg-brand transition-all duration-200"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  </div>
                                  <IconChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand-text" />
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Local Attempt History */}
        <section
          aria-labelledby="history-heading"
          className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
            <div>
              <h2 id="history-heading" className="text-base font-semibold text-ink">
                Riwayat Latihan Terakhir
              </h2>
              <p className="text-xs text-ink-muted">Tersimpan lokal di browser ini</p>
            </div>
            {progress.recentAttempts.length > 0 ? (
              confirmReset ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      clearLocalProgress();
                      setConfirmReset(false);
                    }}
                    className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink-secondary hover:bg-subtle"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition hover:bg-subtle hover:text-red-600 dark:hover:text-red-400"
                  title="Reset riwayat lokal"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )
            ) : null}
          </div>

          {progress.recentAttempts.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-subtle text-ink-muted">
                <IconClock className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">Belum ada riwayat pengerjaan</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Setelah kamu menyelesaikan satu subtes, skor dan tautan pembahasannya akan muncul di sini agar mudah ditinjau kembali.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {progress.recentAttempts.slice(0, 8).map((item) => {
                const pct = item.totalQuestions > 0 ? Math.round((item.score / item.totalQuestions) * 100) : 0;
                const badgeClass =
                  pct >= 75
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : pct >= 50
                      ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300";

                return (
                  <li key={item.attemptId}>
                    <Link
                      href={`/result/${item.attemptId}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-subtle/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{item.subtestName}</p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {item.companyName} · {item.packageName}
                          {item.completedAt ? ` · ${formatShortDate(item.completedAt)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ${badgeClass}`}>
                          {item.score}/{item.totalQuestions}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
