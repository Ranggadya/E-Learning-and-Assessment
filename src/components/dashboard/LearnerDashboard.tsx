"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconAward,
  IconBell,
  IconCheckCircle,
  IconClipboardList,
  IconLayers,
  IconRotateCcw,
  IconSearch,
} from "@/components/ui/Icons";
import {
  buildWeeklyActivitySeries,
  computeDashboardStats,
  computeInProgressPackageCount,
  computeNextAction,
  getCompanyMonogram,
  selectCompanyPackages,
} from "@/lib/assessment/dashboard";
import { useLocalProgress } from "@/lib/client/local-progress";
import type { DashboardCompany, DashboardPackage } from "@/types/assessment";

interface LearnerDashboardProps {
  catalog: DashboardCompany[];
  initialNowIso: string;
}

interface ChartPoint {
  x: number;
  y: number;
}

const CHART_WIDTH = 500;
const CHART_Y_TOP = 26;
const CHART_Y_BOTTOM = 104;
const CHART_AREA_BOTTOM = 122;

const GAUGE_RADIUS = 70;
const GAUGE_ARC_PATH = "M 20 92 A 70 70 0 0 1 160 92";
const GAUGE_ARC_LENGTH = Math.PI * GAUGE_RADIUS;

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

function buildSmoothCurvePath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }

  const segments: string[] = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    segments.push(
      `C ${midX.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
    );
  }
  return segments.join(" ");
}

function buildAreaPath(linePath: string, points: ChartPoint[]): string {
  if (!linePath || points.length === 0) {
    return "";
  }
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)} ${CHART_AREA_BOTTOM} L ${first.x.toFixed(1)} ${CHART_AREA_BOTTOM} Z`;
}

export function LearnerDashboard({ catalog, initialNowIso }: LearnerDashboardProps) {
  const progress = useLocalProgress();
  const [query, setQuery] = useState("");
  const [selectedCompanySlug, setSelectedCompanySlug] = useState("");
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const referenceDate = useMemo(() => new Date(initialNowIso), [initialNowIso]);
  const stats = useMemo(() => computeDashboardStats(catalog, progress), [catalog, progress]);
  const inProgressCount = useMemo(
    () => computeInProgressPackageCount(catalog, progress),
    [catalog, progress],
  );
  const nextAction = useMemo(() => computeNextAction(catalog, progress), [catalog, progress]);
  const series = useMemo(
    () => buildWeeklyActivitySeries(catalog, progress, referenceDate),
    [catalog, progress, referenceDate],
  );

  const completionPct =
    stats.totalSubtests > 0
      ? Math.min(100, Math.round((stats.completedSubtests / stats.totalSubtests) * 100))
      : 0;
  const gaugeDashOffset = GAUGE_ARC_LENGTH * (1 - completionPct / 100);

  const activeDayIndex =
    selectedDayIndex !== null && selectedDayIndex >= 0 && selectedDayIndex < series.days.length
      ? selectedDayIndex
      : series.peakIndex;
  const activeDay = series.days[activeDayIndex] ?? series.days[series.days.length - 1];

  const chartGeometry = useMemo(() => {
    const count = series.days.length;
    const maxMinutes = series.days.reduce((max, day) => Math.max(max, day.estimatedMinutes), 0);
    const points: ChartPoint[] = series.days.map((day, idx) => {
      const x = ((idx + 0.5) / Math.max(1, count)) * CHART_WIDTH;
      const y =
        maxMinutes === 0
          ? CHART_Y_BOTTOM
          : CHART_Y_BOTTOM - (day.estimatedMinutes / maxMinutes) * (CHART_Y_BOTTOM - CHART_Y_TOP);
      return { x, y };
    });
    const linePath = buildSmoothCurvePath(points);
    const areaPath = buildAreaPath(linePath, points);
    return { points, linePath, areaPath, maxMinutes };
  }, [series.days]);

  const activePoint = chartGeometry.points[activeDayIndex] ?? {
    x: CHART_WIDTH / 2,
    y: CHART_Y_BOTTOM,
  };

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const { visiblePackages, totalFilteredPackages, hiddenPackageCount, companyByPackageId } =
    useMemo(() => {
      const searchedCatalog = filterCatalog(catalog, trimmedQuery.toLowerCase());
      const scopedCatalog = selectedCompanySlug
        ? searchedCatalog.filter((company) => company.slug === selectedCompanySlug)
        : searchedCatalog;

      const flatPackages: DashboardPackage[] = [];
      const companyMap = new Map<number, DashboardCompany>();

      for (const company of scopedCatalog) {
        for (const pkg of company.packages) {
          flatPackages.push(pkg);
          companyMap.set(pkg.id, company);
        }
      }

      const bypassCap = selectedCompanySlug !== "" || isSearching || showAllPackages;
      const { visible, hiddenCount } = selectCompanyPackages(flatPackages, progress, bypassCap, 6);

      return {
        visiblePackages: visible,
        totalFilteredPackages: flatPackages.length,
        hiddenPackageCount: hiddenCount,
        companyByPackageId: companyMap,
      };
    }, [catalog, trimmedQuery, selectedCompanySlug, isSearching, showAllPackages, progress]);

  const cardSurfaceClass =
    "rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none";

  return (
    <div className="space-y-6">
      {/* Blok 1: Top Header Bar */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-72 sm:flex-initial">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari perusahaan, paket, atau subtes..."
              aria-label="Cari perusahaan, paket, atau subtes"
              className="w-full rounded-full border border-line-strong bg-surface py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-brand"
            />
          </div>

          <Link
            href="/riwayat"
            aria-label="Buka riwayat latihan"
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
          >
            <IconBell className="h-4 w-4" />
            {progress.recentAttempts.length > 0 ? (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand ring-2 ring-surface"
              />
            ) : null}
          </Link>
        </div>
      </header>

      {/* Blok 2: 3 Kartu KPI */}
      <section aria-label="Ringkasan statistik latihan" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={`${cardSurfaceClass} flex items-center gap-4 p-4`}>
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text"
          >
            <IconRotateCcw className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium leading-tight text-ink-muted">
              {inProgressCount > 0 ? "Sedang Berjalan" : "Paket Tersedia"}
            </p>
            <p className="mt-0.5 text-lg font-extrabold leading-tight tracking-tight tabular-nums text-ink">
              {inProgressCount > 0 ? `${inProgressCount} Paket` : `${stats.totalPackages} Paket`}
            </p>
          </div>
        </div>

        <div className={`${cardSurfaceClass} flex items-center gap-4 p-4`}>
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
          >
            <IconCheckCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium leading-tight text-ink-muted">Subtes Selesai</p>
            <p className="mt-0.5 font-mono text-lg font-extrabold leading-tight tracking-tight tabular-nums text-ink">
              {stats.completedSubtests} / {stats.totalSubtests}
            </p>
          </div>
        </div>

        <div className={`${cardSurfaceClass} flex items-center gap-4 p-4`}>
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-secondary"
          >
            <IconAward className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium leading-tight text-ink-muted">
              {stats.avgAccuracy !== null ? "Rata-rata Akurasi" : "Total Bank Soal"}
            </p>
            <p
              className={`mt-0.5 text-lg font-extrabold leading-tight tracking-tight tabular-nums text-ink ${
                stats.avgAccuracy !== null ? "font-mono" : ""
              }`}
            >
              {stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : `${stats.totalQuestions} Soal`}
            </p>
          </div>
        </div>
      </section>

      {/* Blok 3: Grid Analitik & Performa */}
      <section aria-label="Analitik latihan dan progres keseluruhan" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Kartu Kiri: Aktivitas Latihan 7 Hari */}
        <article className={`${cardSurfaceClass} flex flex-col justify-between p-5 lg:col-span-2`}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-ink">Aktivitas Latihan</h2>
              <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-ink-secondary">
                7 hari terakhir
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium tabular-nums text-ink-muted">
                {series.totalAttempts > 0
                  ? `${series.totalAttempts} sesi · ~${series.totalMinutes} mnt`
                  : "Belum ada sesi dalam 7 hari terakhir"}
              </p>

              {activeDay && (series.totalAttempts > 0 || selectedDayIndex !== null) ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink"
                >
                  <span className="text-ink-secondary">{activeDay.fullDateLabel}</span>
                  <span aria-hidden="true" className="text-ink-muted">
                    ·
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-brand-text">
                    {activeDay.attempts} sesi · ~{activeDay.estimatedMinutes} mnt
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <svg
              viewBox="0 0 500 130"
              className="h-36 w-full overflow-visible sm:h-40"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="activity-area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="activity-column-highlight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Garis panduan horizontal */}
              <line
                x1="12"
                y1="26"
                x2="488"
                y2="26"
                stroke="var(--border-default)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <line
                x1="12"
                y1="65"
                x2="488"
                y2="65"
                stroke="var(--border-default)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <line
                x1="12"
                y1="104"
                x2="488"
                y2="104"
                stroke="var(--border-default)"
                strokeWidth="1"
              />

              {/* Highlight kolom vertikal hari aktif (hanya saat ada aktivitas atau dipilih) */}
              {series.totalAttempts > 0 || selectedDayIndex !== null ? (
                <rect
                  x={Math.max(4, activePoint.x - 24)}
                  y={10}
                  width={48}
                  height={112}
                  rx={12}
                  fill="url(#activity-column-highlight)"
                />
              ) : null}

              {/* Area gradasi di bawah kurva */}
              {chartGeometry.maxMinutes > 0 && chartGeometry.areaPath ? (
                <path d={chartGeometry.areaPath} fill="url(#activity-area-fill)" />
              ) : null}

              {/* Kurva Bezier halus */}
              {chartGeometry.linePath ? (
                <path
                  d={chartGeometry.linePath}
                  fill="none"
                  stroke={series.totalAttempts > 0 ? "var(--accent)" : "var(--border-strong)"}
                  strokeWidth={series.totalAttempts > 0 ? "2.5" : "1.75"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {/* Garis bantu vertikal & titik aktif */}
              {series.totalAttempts > 0 || selectedDayIndex !== null ? (
                <>
                  <line
                    x1={activePoint.x}
                    y1={activePoint.y + 6}
                    x2={activePoint.x}
                    y2={116}
                    stroke="var(--accent)"
                    strokeOpacity="0.35"
                    strokeDasharray="3 3"
                    strokeWidth="1.25"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={8}
                    fill="var(--accent)"
                    fillOpacity="0.16"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={4.5}
                    fill="var(--bg-surface)"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                  />
                </>
              ) : null}
            </svg>

            <div className="mt-2 grid grid-cols-7 gap-1">
              {series.days.map((day, idx) => {
                const isActive =
                  (series.totalAttempts > 0 || selectedDayIndex !== null) && idx === activeDayIndex;
                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    aria-pressed={isActive}
                    aria-label={`${day.dayLabel}, ${day.fullDateLabel}: ${day.attempts} sesi, sekitar ${day.estimatedMinutes} menit`}
                    className={`flex min-h-[36px] items-center justify-center rounded-xl px-1 py-1 text-xs transition ${
                      isActive
                        ? "bg-brand-soft font-bold text-brand-text"
                        : "font-medium text-ink-muted hover:bg-subtle hover:text-ink"
                    }`}
                  >
                    {day.dayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </article>

        {/* Kartu Kanan: Progres Keseluruhan */}
        <article className={`${cardSurfaceClass} flex flex-col justify-between p-5 lg:col-span-1`}>
          <h2 className="text-base font-bold text-ink">Progres Keseluruhan</h2>

          <div className="my-3 flex flex-col items-center">
            <div className="relative mx-auto flex w-full max-w-[200px] flex-col items-center">
              <svg
                viewBox="0 0 180 105"
                className="h-auto w-full overflow-visible"
                role="img"
                aria-label={`Progres keseluruhan ${completionPct} persen`}
              >
                <path
                  d={GAUGE_ARC_PATH}
                  fill="none"
                  stroke="var(--bg-subtle)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {completionPct > 0 ? (
                  <path
                    d={GAUGE_ARC_PATH}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={GAUGE_ARC_LENGTH}
                    strokeDashoffset={gaugeDashOffset}
                  />
                ) : null}
              </svg>
              <div className="-mt-11 flex flex-col items-center text-center">
                <span className="font-mono text-2xl font-extrabold tabular-nums text-ink">
                  {completionPct}%
                </span>
                <span className="text-xs font-medium text-ink-muted">Tuntas</span>
              </div>
            </div>

            <p className="mt-4 text-center text-xs font-medium leading-relaxed text-ink-secondary">
              {completionPct >= 80
                ? "Hampir seluruh latihan tuntas!"
                : completionPct > 0
                  ? "Terus jaga ritme latihanmu!"
                  : "Mulai subtes pertamamu hari ini."}
            </p>
          </div>

          <Link
            href="/riwayat"
            className="inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-line-strong bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
          >
            Lihat Riwayat &amp; Detail
          </Link>
        </article>
      </section>

      {/* Blok 4: Banner Fokus Latihan Berikutnya */}
      {nextAction !== null ? (
        <section aria-labelledby="next-action-heading">
          <h2 id="next-action-heading" className="mb-3 text-base font-bold text-ink">
            Fokus Latihan Berikutnya
          </h2>
          <div className={`${cardSurfaceClass} flex flex-col items-stretch gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between`}>
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text"
              >
                <IconClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-snug text-ink lg:truncate">
                  {nextAction.title}
                </h3>
                <p className="mt-0.5 text-xs text-ink-secondary">{nextAction.meta}</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 sm:gap-5 lg:justify-end">
              <div className="text-left lg:text-right">
                <p className="text-xs font-medium text-ink-muted">Estimasi</p>
                <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-ink">
                  ~{nextAction.estimatedMinutes} menit
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href={nextAction.mode === "resume" ? nextAction.packageHref : "/riwayat"}
                  className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
                >
                  {nextAction.mode === "resume" ? "Lihat Paket" : "Lihat Riwayat"}
                </Link>
                <Link
                  href={nextAction.href}
                  className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
                >
                  <span>{nextAction.ctaLabel}</span>
                  <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Blok 5: Daftar Paket Tes */}
      <section aria-labelledby="packages-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 id="packages-heading" className="text-base font-bold text-ink">
              Paket Tes
            </h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-subtle px-2 text-xs font-bold tabular-nums text-ink-secondary">
              {totalFilteredPackages}
            </span>
          </div>

          {catalog.length > 1 ? (
            <div
              role="group"
              aria-label="Filter kategori tes"
              className="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setSelectedCompanySlug("")}
                aria-pressed={selectedCompanySlug === ""}
                className={`inline-flex min-h-[36px] items-center justify-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedCompanySlug === ""
                    ? "border-brand/40 bg-brand-soft text-brand-text"
                    : "border-line bg-surface text-ink-secondary hover:bg-subtle hover:text-ink"
                }`}
              >
                Semua
              </button>
              {catalog.map((company) => {
                const isSelected = selectedCompanySlug === company.slug;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setSelectedCompanySlug(company.slug)}
                    aria-pressed={isSelected}
                    className={`inline-flex min-h-[36px] items-center justify-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "border-brand/40 bg-brand-soft text-brand-text"
                        : "border-line bg-surface text-ink-secondary hover:bg-subtle hover:text-ink"
                    }`}
                  >
                    {company.name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {catalog.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center">
            <IconLayers className="mx-auto h-8 w-8 text-ink-muted" />
            <h3 className="mt-3 text-base font-bold text-ink">Belum ada paket soal</h3>
            <p className="mt-1 text-sm text-ink-secondary">
              Unggah file paket soal berformat JSON melalui halaman CMS Admin untuk mulai berlatih.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
            >
              Buka CMS Admin
            </Link>
          </div>
        ) : visiblePackages.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="text-sm font-medium text-ink-secondary">
              {isSearching
                ? `Tidak ada kategori, paket, atau subtes yang cocok dengan kata kunci "${trimmedQuery}".`
                : "Belum ada paket pada kategori yang dipilih."}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedCompanySlug("");
              }}
              className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl border border-line-strong bg-surface px-4 py-2 text-xs font-bold text-ink transition hover:bg-subtle"
            >
              Reset pencarian
            </button>
          </div>
        ) : (
          <>
            <div className={`${cardSurfaceClass} overflow-hidden`}>
              <ul className="divide-y divide-line">
                {visiblePackages.map((pkg) => {
                  const company = companyByPackageId.get(pkg.id);
                  if (!company) {
                    return null;
                  }
                  const totalSub = pkg.subtests.length;
                  const totalMinutes = Math.max(
                    1,
                    Math.round(
                      pkg.subtests.reduce((acc, s) => acc + Math.max(0, s.durationSeconds), 0) / 60,
                    ),
                  );
                  const doneSub = pkg.subtests.filter((s) =>
                    Boolean(progress.bySubtestId[String(s.id)]),
                  ).length;
                  const percent =
                    totalSub > 0 ? Math.min(100, Math.round((doneSub / totalSub) * 100)) : 0;
                  const isInProgress = doneSub > 0 && doneSub < totalSub;
                  const ctaLabel = isInProgress
                    ? "Lanjutkan"
                    : doneSub === totalSub && totalSub > 0
                      ? "Tinjau"
                      : "Mulai";

                  return (
                    <li
                      key={pkg.id}
                      className="flex flex-col gap-3 p-4 transition hover:bg-subtle/45 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-xs font-bold text-ink-secondary"
                        >
                          {getCompanyMonogram(company.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/c/${company.slug}/${pkg.slug}`}
                            className="block truncate text-sm font-bold text-ink transition hover:text-brand-text"
                          >
                            {pkg.name}
                          </Link>
                          <p className="mt-0.5 truncate text-xs tabular-nums text-ink-muted">
                            {company.name} · {totalSub} subtes · ~{totalMinutes} mnt
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:shrink-0">
                        <div className="flex flex-1 items-center gap-3 sm:w-44 sm:flex-initial lg:w-52">
                          <div
                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle"
                            role="progressbar"
                            aria-valuenow={percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Progres ${pkg.name}`}
                          >
                            <div
                              className="h-full rounded-full bg-brand transition-all duration-200"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-9 text-right font-mono text-xs font-bold tabular-nums text-ink">
                            {percent}%
                          </span>
                        </div>

                        <Link
                          href={`/c/${company.slug}/${pkg.slug}`}
                          className={
                            isInProgress
                              ? "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-xl border border-brand/40 bg-brand-soft px-4 py-2 text-xs font-bold text-brand-text transition hover:bg-brand/15"
                              : "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
                          }
                        >
                          {ctaLabel}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {hiddenPackageCount > 0 ? (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllPackages(true)}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-line-strong bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
                >
                  Tampilkan semua ({totalFilteredPackages} paket)
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
