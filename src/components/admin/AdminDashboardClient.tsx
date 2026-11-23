"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import {
  IconAlertTriangle,
  IconClipboardList,
  IconDownload,
  IconEdit,
  IconExternalLink,
  IconLayers,
  IconSearch,
  IconUpload,
} from "@/components/ui/Icons";
import { getCompanyMonogram } from "@/lib/dashboard-helpers";
import {
  resolveSubtestDuration,
  SUBTEST_KIND_LABEL,
  SUBTEST_UNIT,
  type AdminCompany,
  type AdminPackage,
  type AdminSubtest,
  type SubtestKind,
} from "@/lib/types";

interface AdminDashboardClientProps {
  companies: AdminCompany[];
}

type ExplanationFilter = "all" | "needs_explanation" | "complete";

type EditingTarget =
  | { type: "package"; id: number }
  | { type: "subtest"; id: number; durationUnit: "minutes" | "seconds"; isConfigLocked: boolean };

interface PackageExplanationSummary {
  totalItems: number;
  quizQuestions: number;
  detailedQuizQuestions: number;
  needsExplanation: boolean;
  isComplete: boolean;
}

const BADGE_TONE_CLASSES = {
  neutral: "border border-line bg-subtle text-ink-secondary",
  emerald:
    "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300",
  amber:
    "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/60 dark:text-amber-300",
  rose:
    "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/60 dark:text-rose-300",
  brand: "border border-brand/30 bg-brand-soft text-brand-text",
} as const;

const FILTER_OPTIONS: Array<{ value: ExplanationFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "needs_explanation", label: "Perlu Pembahasan" },
  { value: "complete", label: "Lengkap" },
];

function summarizePackage(pkg: AdminPackage): PackageExplanationSummary {
  let totalItems = 0;
  let quizQuestions = 0;
  let detailedQuizQuestions = 0;
  let needsExplanation = false;

  for (const subtest of pkg.subtests) {
    totalItems += subtest.questionCount;
    const kind: SubtestKind = subtest.kind ?? "QUIZ";
    if (kind !== "QUIZ") {
      continue;
    }
    const detailed = Math.min(subtest.questionCount, Math.max(0, subtest.detailedExplanationCount));
    quizQuestions += subtest.questionCount;
    detailedQuizQuestions += detailed;
    if (subtest.questionCount > 0 && detailed < subtest.questionCount) {
      needsExplanation = true;
    }
  }

  return {
    totalItems,
    quizQuestions,
    detailedQuizQuestions,
    needsExplanation,
    isComplete: quizQuestions > 0 && detailedQuizQuestions >= quizQuestions,
  };
}

function matchesStatusFilter(pkg: AdminPackage, filter: ExplanationFilter): boolean {
  if (filter === "all") {
    return true;
  }
  const summary = summarizePackage(pkg);
  return filter === "needs_explanation" ? summary.needsExplanation : summary.isComplete;
}

function getPackageStatusBadge(summary: PackageExplanationSummary): {
  label: string;
  className: string;
} {
  if (summary.quizQuestions === 0) {
    return { label: "Non-Kuis", className: BADGE_TONE_CLASSES.neutral };
  }
  if (summary.detailedQuizQuestions >= summary.quizQuestions) {
    return {
      label: `Pembahasan Lengkap (${summary.detailedQuizQuestions}/${summary.quizQuestions})`,
      className: BADGE_TONE_CLASSES.emerald,
    };
  }
  if (summary.detailedQuizQuestions > 0) {
    return {
      label: `Pembahasan Parsial (${summary.detailedQuizQuestions}/${summary.quizQuestions})`,
      className: BADGE_TONE_CLASSES.amber,
    };
  }
  return {
    label: `Belum Ada Pembahasan (0/${summary.quizQuestions})`,
    className: BADGE_TONE_CLASSES.rose,
  };
}

function getSubtestExplanationBadge(subtest: AdminSubtest): {
  label: string;
  className: string;
} | null {
  const kind: SubtestKind = subtest.kind ?? "QUIZ";
  if (kind !== "QUIZ" || subtest.questionCount <= 0) {
    return null;
  }
  const detailed = Math.min(subtest.questionCount, Math.max(0, subtest.detailedExplanationCount));
  if (detailed >= subtest.questionCount) {
    return {
      label: `Lengkap ${detailed}/${subtest.questionCount}`,
      className: BADGE_TONE_CLASSES.emerald,
    };
  }
  if (detailed > 0) {
    return {
      label: `Parsial ${detailed}/${subtest.questionCount}`,
      className: BADGE_TONE_CLASSES.amber,
    };
  }
  return {
    label: "Belum Ada",
    className: BADGE_TONE_CLASSES.rose,
  };
}

function formatDurationLabel(seconds: number): string {
  if (seconds <= 0) {
    return "0 detik";
  }
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60} menit`;
  }
  if (seconds < 60) {
    return `${seconds} detik`;
  }
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins} menit ${rem} dtk`;
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return typeof data.error === "string" && data.error.trim() ? data.error : fallback;
}

export function AdminDashboardClient({ companies }: AdminDashboardClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExplanationFilter>("all");
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);

  const [pkgName, setPkgName] = useState("");
  const [pkgDescription, setPkgDescription] = useState("");
  const [subtestName, setSubtestName] = useState("");
  const [subtestDurationInput, setSubtestDurationInput] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const packageSummaryById = useMemo(() => {
    const map = new Map<number, PackageExplanationSummary & { subtestCount: number }>();
    for (const company of companies) {
      for (const pkg of company.packages) {
        map.set(pkg.id, {
          ...summarizePackage(pkg),
          subtestCount: pkg.subtests.length,
        });
      }
    }
    return map;
  }, [companies]);

  const totals = useMemo(() => {
    let packages = 0;
    let subtests = 0;
    let quizQuestions = 0;
    let detailedQuizQuestions = 0;

    for (const company of companies) {
      packages += company.packages.length;
      for (const pkg of company.packages) {
        subtests += pkg.subtests.length;
        const summary = packageSummaryById.get(pkg.id) ?? summarizePackage(pkg);
        quizQuestions += summary.quizQuestions;
        detailedQuizQuestions += summary.detailedQuizQuestions;
      }
    }

    const explanationPercent =
      quizQuestions > 0 ? Math.round((detailedQuizQuestions / quizQuestions) * 100) : null;

    return {
      companies: companies.length,
      packages,
      subtests,
      quizQuestions,
      detailedQuizQuestions,
      explanationPercent,
    };
  }, [companies, packageSummaryById]);

  const filteredCompanies = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed && statusFilter === "all") {
      return companies;
    }

    return companies
      .map((company) => {
        const companyMatches =
          trimmed.length > 0 &&
          (company.name.toLowerCase().includes(trimmed) ||
            company.slug.toLowerCase().includes(trimmed));

        const matchedPackages = company.packages
          .filter((pkg) => matchesStatusFilter(pkg, statusFilter))
          .map((pkg) => {
            if (!trimmed || companyMatches) {
              return pkg;
            }
            if (
              pkg.name.toLowerCase().includes(trimmed) ||
              pkg.slug.toLowerCase().includes(trimmed)
            ) {
              return pkg;
            }
            const matchedSubtests = pkg.subtests.filter(
              (s) =>
                s.name.toLowerCase().includes(trimmed) ||
                s.slug.toLowerCase().includes(trimmed),
            );
            return matchedSubtests.length > 0 ? { ...pkg, subtests: matchedSubtests } : null;
          })
          .filter((item): item is AdminPackage => item !== null);

        return matchedPackages.length > 0 ? { ...company, packages: matchedPackages } : null;
      })
      .filter((item): item is AdminCompany => item !== null);
  }, [companies, query, statusFilter]);

  function openPackageEdit(pkg: AdminPackage) {
    if (editingTarget?.type === "package" && editingTarget.id === pkg.id) {
      setEditingTarget(null);
      setEditError(null);
      return;
    }
    setEditingTarget({ type: "package", id: pkg.id });
    setPkgName(pkg.name);
    setPkgDescription(pkg.description ?? "");
    setEditError(null);
  }

  function openSubtestEdit(subtest: AdminSubtest) {
    if (editingTarget?.type === "subtest" && editingTarget.id === subtest.id) {
      setEditingTarget(null);
      setEditError(null);
      return;
    }
    const kind: SubtestKind = subtest.kind ?? "QUIZ";
    const isConfigLocked = kind === "PAULI" || kind === "DRAWING";
    const durationUnit: "minutes" | "seconds" =
      subtest.durationSeconds >= 60 && subtest.durationSeconds % 60 === 0 ? "minutes" : "seconds";

    setEditingTarget({ type: "subtest", id: subtest.id, durationUnit, isConfigLocked });
    setSubtestName(subtest.name);
    setSubtestDurationInput(
      durationUnit === "minutes"
        ? String(subtest.durationSeconds / 60)
        : String(subtest.durationSeconds),
    );
    setEditError(null);
  }

  function closeEditor() {
    if (isSaving) {
      return;
    }
    setEditingTarget(null);
    setEditError(null);
  }

  async function handleSavePackage(event: React.FormEvent<HTMLFormElement>, pkgId: number) {
    event.preventDefault();
    const trimmedName = pkgName.trim();
    if (!trimmedName) {
      setEditError("Nama paket tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const response = await fetch(`/api/admin/packs/${pkgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: pkgDescription.trim() || null,
        }),
      });
      if (!response.ok) {
        setEditError(await readApiError(response, "Gagal memperbarui paket."));
        return;
      }
      setEditingTarget(null);
      router.refresh();
    } catch {
      setEditError("Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveSubtest(
    event: React.FormEvent<HTMLFormElement>,
    subtestId: number,
    target: Extract<EditingTarget, { type: "subtest" }>,
  ) {
    event.preventDefault();
    const trimmedName = subtestName.trim();
    if (!trimmedName) {
      setEditError("Nama subtes tidak boleh kosong.");
      return;
    }

    const payload: { name: string; durationSeconds?: number } = { name: trimmedName };
    if (!target.isConfigLocked) {
      const parsed = Number(subtestDurationInput.trim());
      if (target.durationUnit === "minutes") {
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 180) {
          setEditError("Durasi subtes harus bilangan bulat antara 1 hingga 180 menit.");
          return;
        }
        payload.durationSeconds = parsed * 60;
      } else {
        if (!Number.isInteger(parsed) || parsed < 10 || parsed > 10800) {
          setEditError("Durasi subtes harus bilangan bulat antara 10 hingga 10800 detik.");
          return;
        }
        payload.durationSeconds = parsed;
      }
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const response = await fetch(`/api/admin/subtests/${subtestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setEditError(await readApiError(response, "Gagal memperbarui subtes."));
        return;
      }
      setEditingTarget(null);
      router.refresh();
    } catch {
      setEditError("Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  const isFiltering = query.trim().length > 0 || statusFilter !== "all";
  const filteredPackageCount = filteredCompanies.reduce(
    (sum, company) => sum + company.packages.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]">
            Manajemen Paket Soal
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Pantau kelengkapan pembahasan kuis, sunting metadata paket/subtes, atau impor JSON baru.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/admin/template"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
          >
            <IconDownload className="h-4 w-4 text-ink-secondary" />
            <span>Contoh JSON</span>
          </a>
          <Link
            href="/admin/audit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
          >
            <IconClipboardList className="h-4 w-4 text-ink-secondary" />
            <span>Audit Log</span>
          </Link>
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-brand-hover"
          >
            <IconUpload className="h-4 w-4" />
            <span>Impor JSON</span>
          </Link>
        </div>
      </div>

      {/* Unified Summary Strip */}
      <section
        aria-label="Ringkasan database soal"
        className="overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none"
      >
        <dl className="grid grid-cols-2 sm:grid-cols-4">
          <div className="p-4 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Perusahaan</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{totals.companies}</dd>
          </div>
          <div className="border-l border-line p-4 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Paket</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{totals.packages}</dd>
          </div>
          <div className="border-t border-line p-4 sm:border-l sm:border-t-0 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Subtes</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{totals.subtests}</dd>
          </div>
          <div className="border-l border-t border-line p-4 sm:border-t-0 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Pembahasan Rinci</dt>
            <dd className="mt-1">
              <span className="block text-2xl font-bold tabular-nums text-brand-text">
                {totals.explanationPercent !== null ? `${totals.explanationPercent}%` : "—"}
              </span>
              <span className="mt-0.5 block text-xs font-medium tabular-nums text-ink-muted">
                {totals.detailedQuizQuestions}/{totals.quizQuestions} soal kuis
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* Filter Bar */}
      {companies.length > 0 ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter perusahaan, paket, atau subtes..."
              aria-label="Filter paket soal"
              className="w-full rounded-lg border border-line-strong bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div role="group" aria-label="Filter status pembahasan" className="flex flex-wrap items-center gap-1.5">
              {FILTER_OPTIONS.map((option) => {
                const isPressed = statusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isPressed}
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      isPressed
                        ? "border-brand bg-brand font-bold text-white shadow-xs"
                        : "border-line-strong bg-surface font-semibold text-ink-secondary hover:bg-subtle hover:text-ink"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {isFiltering ? (
              <span className="text-xs font-medium tabular-nums text-ink-muted">
                {filteredCompanies.length} perusahaan · {filteredPackageCount} paket
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Companies & Packages List */}
      {companies.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line-strong bg-surface p-10 text-center">
          <IconLayers className="mx-auto h-8 w-8 text-ink-muted" />
          <h2 className="mt-3 text-base font-bold text-ink">Belum ada paket di database</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Mulai dengan mengimpor satu file paket JSON atau unduh contoh formatnya terlebih dahulu.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/admin/import"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-brand-hover"
            >
              <IconUpload className="h-4 w-4" />
              <span>Impor Paket Pertama</span>
            </Link>
            <a
              href="/api/admin/template"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
            >
              <IconDownload className="h-4 w-4 text-ink-secondary" />
              <span>Unduh Contoh JSON</span>
            </a>
          </div>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-[10px] border border-line-strong bg-surface p-8 text-center">
          <p className="text-sm font-medium text-ink-secondary">
            Tidak ada paket atau subtes yang sesuai dengan filter saat ini.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
            }}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-subtle"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredCompanies.map((company) => (
            <section
              key={company.id}
              className="overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-none"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-subtle/75 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-deep text-xs font-extrabold tracking-tight text-white"
                  >
                    {getCompanyMonogram(company.name)}
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-base font-extrabold text-ink">{company.name}</h2>
                    <code className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-xs text-ink-muted">
                      {company.slug}
                    </code>
                  </div>
                </div>
                <span className="text-xs font-semibold tabular-nums text-ink-secondary">
                  {company.packages.length} paket
                </span>
              </div>

              {company.packages.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-muted">
                  Belum ada paket pada perusahaan ini.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {company.packages.map((testPackage) => {
                    const summary = packageSummaryById.get(testPackage.id) ?? {
                      ...summarizePackage(testPackage),
                      subtestCount: testPackage.subtests.length,
                    };
                    const pkgBadge = getPackageStatusBadge(summary);
                    const isEditingPkg =
                      editingTarget?.type === "package" && editingTarget.id === testPackage.id;

                    return (
                      <div key={testPackage.id}>
                        <div className="bg-subtle/40 px-5 py-3.5">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/c/${company.slug}/${testPackage.slug}`}
                                  className="inline-flex items-center gap-1.5 text-sm font-bold text-ink transition hover:text-brand-text"
                                >
                                  <span>{testPackage.name}</span>
                                  <IconExternalLink className="h-3.5 w-3.5 text-ink-muted" />
                                </Link>
                                <code className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-xs text-ink-muted">
                                  {testPackage.slug}
                                </code>
                                <span className="text-xs font-medium tabular-nums text-ink-muted">
                                  {summary.subtestCount} subtes · {summary.totalItems} item
                                </span>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${pkgBadge.className}`}
                                >
                                  {pkgBadge.label}
                                </span>
                              </div>
                              {testPackage.description ? (
                                <p className="mt-1.5 max-w-[75ch] text-xs leading-relaxed text-ink-secondary">
                                  {testPackage.description}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openPackageEdit(testPackage)}
                                aria-expanded={isEditingPkg}
                                className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink-secondary transition hover:bg-subtle hover:text-ink"
                              >
                                <IconEdit className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>
                              <Link
                                href="/admin/import"
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-text transition hover:bg-brand-soft"
                              >
                                <IconUpload className="h-3.5 w-3.5" />
                                <span>Impor Pembahasan</span>
                              </Link>
                              <a
                                href={`/api/admin/packs/${testPackage.id}/export`}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-text transition hover:bg-brand-soft"
                              >
                                <IconDownload className="h-3.5 w-3.5" />
                                <span>Ekspor JSON</span>
                              </a>
                              <DeleteButton
                                url={`/api/admin/packs/${testPackage.id}`}
                                label="Hapus paket"
                                confirmLabel="Hapus paket?"
                              />
                            </div>
                          </div>
                        </div>

                        {isEditingPkg ? (
                          <form
                            onSubmit={(event) => handleSavePackage(event, testPackage.id)}
                            className="space-y-3 border-t border-line bg-canvas/70 px-5 py-4"
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor={`pkg-name-${testPackage.id}`}
                                  className="block text-xs font-semibold text-ink"
                                >
                                  Nama Paket
                                </label>
                                <input
                                  id={`pkg-name-${testPackage.id}`}
                                  type="text"
                                  required
                                  maxLength={160}
                                  disabled={isSaving}
                                  value={pkgName}
                                  onChange={(event) => setPkgName(event.target.value)}
                                  className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none disabled:opacity-60"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`pkg-desc-${testPackage.id}`}
                                  className="block text-xs font-semibold text-ink"
                                >
                                  Deskripsi Paket{" "}
                                  <span className="font-normal text-ink-muted">(opsional)</span>
                                </label>
                                <textarea
                                  id={`pkg-desc-${testPackage.id}`}
                                  rows={2}
                                  maxLength={1000}
                                  disabled={isSaving}
                                  value={pkgDescription}
                                  onChange={(event) => setPkgDescription(event.target.value)}
                                  placeholder="Ringkasan singkat paket soal..."
                                  className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none disabled:opacity-60"
                                />
                              </div>
                            </div>

                            {editError ? (
                              <div
                                role="alert"
                                className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
                              >
                                <IconAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{editError}</span>
                              </div>
                            ) : null}

                            <div className="flex items-center gap-2">
                              <button
                                type="submit"
                                disabled={isSaving}
                                className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
                              >
                                {isSaving ? "Menyimpan..." : "Simpan"}
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={closeEditor}
                                className="rounded-lg border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-subtle hover:text-ink disabled:opacity-60"
                              >
                                Batal
                              </button>
                            </div>
                          </form>
                        ) : null}

                        <ul className="divide-y divide-line border-t border-line text-sm">
                          {testPackage.subtests.map((subtest) => {
                            const kind: SubtestKind = subtest.kind ?? "QUIZ";
                            const effectiveDuration = resolveSubtestDuration(
                              kind,
                              subtest.durationSeconds,
                              subtest.config,
                            );
                            const subtestBadge = getSubtestExplanationBadge(subtest);
                            const isEditingSubtest =
                              editingTarget?.type === "subtest" &&
                              editingTarget.id === subtest.id;

                            return (
                              <li key={subtest.id}>
                                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 transition hover:bg-subtle/30">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="font-semibold text-ink">{subtest.name}</span>
                                    <code className="font-mono text-xs text-ink-muted">
                                      {subtest.slug}
                                    </code>
                                    {kind !== "QUIZ" ? (
                                      <span
                                        className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${BADGE_TONE_CLASSES.brand}`}
                                      >
                                        {SUBTEST_KIND_LABEL[kind]}
                                      </span>
                                    ) : null}
                                    <span className="text-xs tabular-nums text-ink-muted">
                                      · {subtest.questionCount} {SUBTEST_UNIT[kind]} ·{" "}
                                      {formatDurationLabel(effectiveDuration)}
                                    </span>
                                    {subtestBadge ? (
                                      <span
                                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${subtestBadge.className}`}
                                      >
                                        {subtestBadge.label}
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openSubtestEdit(subtest)}
                                      aria-expanded={isEditingSubtest}
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink-secondary transition hover:bg-subtle hover:text-ink"
                                    >
                                      <IconEdit className="h-3.5 w-3.5" />
                                      <span>Edit</span>
                                    </button>
                                    <DeleteButton
                                      url={`/api/admin/subtests/${subtest.id}`}
                                      label="Hapus"
                                      confirmLabel="Hapus?"
                                    />
                                  </div>
                                </div>

                                {isEditingSubtest && editingTarget.type === "subtest" ? (
                                  <form
                                    onSubmit={(event) =>
                                      handleSaveSubtest(event, subtest.id, editingTarget)
                                    }
                                    className="space-y-3 border-t border-line bg-canvas/70 px-5 py-3.5"
                                  >
                                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                                      <div>
                                        <label
                                          htmlFor={`subtest-name-${subtest.id}`}
                                          className="block text-xs font-semibold text-ink"
                                        >
                                          Nama Subtes
                                        </label>
                                        <input
                                          id={`subtest-name-${subtest.id}`}
                                          type="text"
                                          required
                                          maxLength={160}
                                          disabled={isSaving}
                                          value={subtestName}
                                          onChange={(event) => setSubtestName(event.target.value)}
                                          className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none disabled:opacity-60"
                                        />
                                      </div>

                                      <div>
                                        {editingTarget.isConfigLocked ? (
                                          <>
                                            <label
                                              htmlFor={`subtest-duration-${subtest.id}`}
                                              className="block text-xs font-semibold text-ink"
                                            >
                                              Durasi
                                            </label>
                                            <input
                                              id={`subtest-duration-${subtest.id}`}
                                              type="text"
                                              disabled
                                              readOnly
                                              value={formatDurationLabel(effectiveDuration)}
                                              aria-describedby={`subtest-duration-help-${subtest.id}`}
                                              className="mt-1 w-full cursor-not-allowed rounded-lg border border-line bg-subtle px-3 py-1.5 text-sm text-ink-muted"
                                            />
                                            <p
                                              id={`subtest-duration-help-${subtest.id}`}
                                              className="mt-1 text-xs text-ink-muted"
                                            >
                                              Durasi mengikuti config JSON
                                            </p>
                                          </>
                                        ) : (
                                          <>
                                            <label
                                              htmlFor={`subtest-duration-${subtest.id}`}
                                              className="block text-xs font-semibold text-ink"
                                            >
                                              {editingTarget.durationUnit === "minutes"
                                                ? "Durasi (menit)"
                                                : "Durasi (detik)"}
                                            </label>
                                            <input
                                              id={`subtest-duration-${subtest.id}`}
                                              type="number"
                                              required
                                              step={1}
                                              min={editingTarget.durationUnit === "minutes" ? 1 : 10}
                                              max={
                                                editingTarget.durationUnit === "minutes"
                                                  ? 180
                                                  : 10800
                                              }
                                              disabled={isSaving}
                                              value={subtestDurationInput}
                                              onChange={(event) =>
                                                setSubtestDurationInput(event.target.value)
                                              }
                                              className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm tabular-nums text-ink focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none disabled:opacity-60"
                                            />
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {editError ? (
                                      <div
                                        role="alert"
                                        className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
                                      >
                                        <IconAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span>{editError}</span>
                                      </div>
                                    ) : null}

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
                                      >
                                        {isSaving ? "Menyimpan..." : "Simpan"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={closeEditor}
                                        className="rounded-lg border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-subtle hover:text-ink disabled:opacity-60"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  </form>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
