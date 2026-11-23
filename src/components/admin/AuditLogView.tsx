"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ADMIN_BADGE_TONES } from "@/components/admin/admin-format";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconClipboardList,
  IconSearch,
  IconUpload,
} from "@/components/ui/Icons";
import { SUBTEST_KIND_LABEL } from "@/lib/assessment/constants";
import { formatDateTimeId } from "@/lib/format";
import type { AuditActionType, AuditStatus, ImportAuditLogEntry } from "@/types/admin";
import type { SubtestKind } from "@/types/assessment";

interface AuditLogViewProps {
  logs: ImportAuditLogEntry[];
  migrationRequired: boolean;
}

type CategoryFilter = "all" | "pack" | "explanation" | "mutation";
type StatusFilter = "all" | AuditStatus;

const ACTION_META: Record<AuditActionType, { label: string; className: string }> = {
  PACK_NEW: { label: "Impor Paket Baru", className: ADMIN_BADGE_TONES.emerald },
  PACK_OVERWRITE: { label: "Timpa Paket Soal", className: ADMIN_BADGE_TONES.amber },
  PACK_DUPLICATE_FORCED: { label: "Duplikat Paket Dipaksa", className: ADMIN_BADGE_TONES.amber },
  EXPLANATION_NEW: { label: "Pembahasan Baru", className: ADMIN_BADGE_TONES.brand },
  EXPLANATION_OVERWRITE: { label: "Timpa Pembahasan", className: ADMIN_BADGE_TONES.amber },
  EXPLANATION_DUPLICATE_FORCED: {
    label: "Duplikat Pembahasan Dipaksa",
    className: ADMIN_BADGE_TONES.amber,
  },
  IMPORT_REJECTED: { label: "Impor Dibatalkan", className: ADMIN_BADGE_TONES.neutral },
  IMPORT_FAILED: { label: "Impor Gagal", className: ADMIN_BADGE_TONES.rose },
  PACKAGE_UPDATED: { label: "Edit Paket", className: ADMIN_BADGE_TONES.brand },
  SUBTEST_UPDATED: { label: "Edit Subtes", className: ADMIN_BADGE_TONES.brand },
  PACKAGE_DELETED: { label: "Hapus Paket", className: ADMIN_BADGE_TONES.rose },
  SUBTEST_DELETED: { label: "Hapus Subtes", className: ADMIN_BADGE_TONES.rose },
};

const STATUS_META: Record<AuditStatus, { label: string; className: string }> = {
  SUCCESS: { label: "SUKSES", className: ADMIN_BADGE_TONES.emerald },
  FORCED: { label: "TIMPA PAKSA", className: ADMIN_BADGE_TONES.amber },
  REJECTED: { label: "DITOLAK", className: ADMIN_BADGE_TONES.neutral },
  FAILED: { label: "GAGAL", className: ADMIN_BADGE_TONES.rose },
};

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "pack", label: "Impor Soal" },
  { value: "explanation", label: "Impor Pembahasan" },
  { value: "mutation", label: "Edit & Hapus" },
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "SUCCESS", label: "Sukses" },
  { value: "FORCED", label: "Timpa Paksa" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "FAILED", label: "Gagal" },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
}

function getActionCategory(entry: ImportAuditLogEntry): Exclude<CategoryFilter, "all"> {
  switch (entry.actionType) {
    case "PACK_NEW":
    case "PACK_OVERWRITE":
    case "PACK_DUPLICATE_FORCED":
      return "pack";
    case "EXPLANATION_NEW":
    case "EXPLANATION_OVERWRITE":
    case "EXPLANATION_DUPLICATE_FORCED":
      return "explanation";
    case "PACKAGE_UPDATED":
    case "SUBTEST_UPDATED":
    case "PACKAGE_DELETED":
    case "SUBTEST_DELETED":
      return "mutation";
    case "IMPORT_REJECTED":
    case "IMPORT_FAILED":
      return entry.summary.mode === "pembahasan" ? "explanation" : "pack";
  }
}

function formatAuditSummary(entry: ImportAuditLogEntry): {
  headline: string;
  details: string[];
} {
  const s = entry.summary;
  const errors = asStringArray(s.errors);
  if (errors.length > 0) {
    const details = errors.length > 1 ? [errors.slice(1, 3).join("; ")] : [];
    if (errors.length > 3) {
      details.push(`+${errors.length - 3} kesalahan lain`);
    }
    return { headline: errors[0], details };
  }

  const warnings = asStringArray(s.warnings);
  if (entry.actionType === "IMPORT_REJECTED") {
    return {
      headline: warnings[0] ?? "Dibatalkan admin sebelum timpa paksa.",
      details: warnings.slice(1, 3),
    };
  }

  const subtestCount = asNumber(s.subtestCount);
  const totalQuestions = asNumber(s.totalQuestions);
  if (subtestCount !== null && totalQuestions !== null) {
    const isExplanation = s.mode === "pembahasan";
    const details: string[] = [];
    const replacedAttempts = asNumber(s.replacedAttempts);
    if (replacedAttempts !== null && replacedAttempts > 0) {
      details.push(`${replacedAttempts} riwayat terdampak`);
    }
    if (warnings.length > 0) {
      details.push(warnings[0]);
      if (warnings.length > 1) {
        details.push(`+${warnings.length - 1} peringatan lain`);
      }
    }
    return {
      headline: `${subtestCount} subtes · ${totalQuestions} ${
        isExplanation ? "butir pembahasan" : "soal"
      }`,
      details,
    };
  }

  const before = asRecord(s.before);
  const after = asRecord(s.after);
  if (entry.actionType === "PACKAGE_UPDATED" && before && after) {
    const changes: string[] = [];
    const prevName = asString(before.name);
    const nextName = asString(after.name);
    if (prevName && nextName && prevName !== nextName) {
      changes.push(`Nama: "${prevName}" → "${nextName}"`);
    }
    if ((before.description ?? null) !== (after.description ?? null)) {
      changes.push("Deskripsi diperbarui");
    }
    return {
      headline: changes[0] ?? "Metadata paket disimpan",
      details: changes.slice(1),
    };
  }

  if (entry.actionType === "SUBTEST_UPDATED" && before && after) {
    const changes: string[] = [];
    const prevName = asString(before.name);
    const nextName = asString(after.name);
    if (prevName && nextName && prevName !== nextName) {
      changes.push(`Nama: "${prevName}" → "${nextName}"`);
    }
    const prevDuration = asNumber(before.durationSeconds);
    const nextDuration = asNumber(after.durationSeconds);
    if (prevDuration !== null && nextDuration !== null && prevDuration !== nextDuration) {
      changes.push(`Durasi: ${prevDuration} dtk → ${nextDuration} dtk`);
    }
    const rawKind = asString(s.kind) as SubtestKind | null;
    const kindLabel = rawKind && rawKind in SUBTEST_KIND_LABEL ? SUBTEST_KIND_LABEL[rawKind] : null;
    const details = changes.slice(1);
    if (kindLabel) {
      details.push(`Tipe: ${kindLabel}`);
    }
    return {
      headline: changes[0] ?? "Metadata subtes disimpan",
      details,
    };
  }

  if (entry.actionType === "PACKAGE_DELETED") {
    const companyName = asString(s.companyName);
    const packageName = asString(s.packageName);
    return {
      headline:
        companyName && packageName
          ? `Paket "${companyName} / ${packageName}" dihapus permanen.`
          : "Paket dihapus permanen.",
      details: [],
    };
  }

  if (entry.actionType === "SUBTEST_DELETED") {
    const subtestName = asString(s.subtestName);
    const subtestSlug = asString(s.subtestSlug);
    return {
      headline: subtestName
        ? `Subtes "${subtestName}"${subtestSlug ? ` (${subtestSlug})` : ""} dihapus permanen.`
        : "Subtes dihapus permanen.",
      details: [],
    };
  }

  return { headline: "Aktivitas tercatat", details: [] };
}

function matchesSearch(entry: ImportAuditLogEntry, needle: string): boolean {
  if (!needle) {
    return true;
  }
  const fields = [
    entry.targetLabel,
    entry.companySlug,
    entry.packageSlug,
    entry.fileName,
    entry.contentHash,
  ];
  return fields.some((field) => field && field.toLowerCase().includes(needle));
}

export function AuditLogView({ logs, migrationRequired }: AuditLogViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    let success = 0;
    let forced = 0;
    let rejectedOrFailed = 0;

    for (const log of logs) {
      if (log.status === "SUCCESS") {
        success += 1;
      } else if (log.status === "FORCED") {
        forced += 1;
      } else {
        rejectedOrFailed += 1;
      }
    }

    return {
      total: logs.length,
      success,
      forced,
      rejectedOrFailed,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((entry) => {
      if (categoryFilter !== "all" && getActionCategory(entry) !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "all" && entry.status !== statusFilter) {
        return false;
      }
      return matchesSearch(entry, needle);
    });
  }, [logs, categoryFilter, statusFilter, query]);

  const preparedLogs = useMemo(() => {
    return filteredLogs.map((entry) => ({
      entry,
      actionMeta: ACTION_META[entry.actionType] ?? {
        label: entry.actionType,
        className: ADMIN_BADGE_TONES.neutral,
      },
      statusMeta: STATUS_META[entry.status] ?? {
        label: entry.status,
        className: ADMIN_BADGE_TONES.neutral,
      },
      formattedSummary: formatAuditSummary(entry),
      slugPath:
        entry.companySlug && entry.packageSlug
          ? `${entry.companySlug}/${entry.packageSlug}`
          : entry.companySlug ?? entry.packageSlug,
    }));
  }, [filteredLogs]);

  if (migrationRequired) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
          >
            <IconArrowLeft className="h-4 w-4" />
            <span>Kembali ke Paket Soal</span>
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]">
            Audit Log CMS
          </h1>
        </div>

        <div
          role="alert"
          className="rounded-[10px] border border-amber-300 bg-amber-50 p-6 text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/50 dark:text-amber-100"
        >
          <div className="flex items-start gap-3">
            <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-2">
              <h2 className="text-base font-bold">Migrasi tabel audit log diperlukan</h2>
              <p className="text-sm leading-relaxed">
                Tabel <code className="font-mono font-semibold">import_audit_logs</code> belum
                tersedia di database. Jalankan perintah migrasi di server untuk mengaktifkan
                pencatatan audit impor dan mutasi CMS:
              </p>
              <pre className="inline-block rounded-lg border border-amber-300 bg-surface px-3.5 py-2 font-mono text-xs font-semibold text-ink dark:border-amber-700">
                npm run db:migrate
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFiltering =
    categoryFilter !== "all" || statusFilter !== "all" || query.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]">
            Audit Log CMS
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Jejak impor paket, impor pembahasan, pembatalan timpa paksa, serta edit/hapus metadata
            (100 entri terbaru).
          </p>
        </div>

        <Link
          href="/admin/import"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-brand-hover"
        >
          <IconUpload className="h-4 w-4" />
          <span>Impor JSON</span>
        </Link>
      </div>

      {/* 4-Stat Summary Strip */}
      <section
        aria-label="Ringkasan statistik audit log"
        className="overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none"
      >
        <dl className="grid grid-cols-2 sm:grid-cols-4">
          <div className="p-4 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Total Tercatat</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{stats.total}</dd>
          </div>
          <div className="border-l border-line p-4 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Sukses</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {stats.success}
            </dd>
          </div>
          <div className="border-t border-line p-4 sm:border-l sm:border-t-0 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Timpa Paksa</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {stats.forced}
            </dd>
          </div>
          <div className="border-l border-t border-line p-4 sm:border-t-0 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Ditolak / Gagal</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
              {stats.rejectedOrFailed}
            </dd>
          </div>
        </dl>
      </section>

      {/* Filter Bar */}
      {logs.length > 0 ? (
        <div className="space-y-3 rounded-[10px] border border-line-strong bg-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari target, slug, nama file, atau hash..."
                aria-label="Cari log audit"
                className="w-full rounded-lg border border-line-strong bg-canvas py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none"
              />
            </div>

            {isFiltering ? (
              <span className="text-xs font-semibold tabular-nums text-ink-muted">
                Menampilkan {filteredLogs.length} dari {logs.length} entri
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Filter kategori aksi"
              className="flex flex-wrap items-center gap-1.5"
            >
              {CATEGORY_OPTIONS.map((option) => {
                const isPressed = categoryFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isPressed}
                    onClick={() => setCategoryFilter(option.value)}
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

            <div
              role="group"
              aria-label="Filter status log"
              className="flex flex-wrap items-center gap-1.5"
            >
              {STATUS_OPTIONS.map((option) => {
                const isPressed = statusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isPressed}
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
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
          </div>
        </div>
      ) : null}

      {/* Empty States or Log Table/Cards */}
      {logs.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line-strong bg-surface p-10 text-center">
          <IconClipboardList className="mx-auto h-8 w-8 text-ink-muted" />
          <h2 className="mt-3 text-base font-bold text-ink">Belum ada aktivitas tercatat</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Aktivitas impor paket, impor pembahasan, serta edit/hapus dari dashboard admin akan
            otomatis muncul di sini.
          </p>
          <div className="mt-5">
            <Link
              href="/admin/import"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-brand-hover"
            >
              <IconUpload className="h-4 w-4" />
              <span>Impor JSON</span>
            </Link>
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-[10px] border border-line-strong bg-surface p-8 text-center">
          <p className="text-sm font-medium text-ink-secondary">
            Tidak ada log audit yang sesuai dengan filter saat ini.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter("all");
              setStatusFilter("all");
              setQuery("");
            }}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-subtle"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-subtle/75 text-xs font-bold uppercase tracking-wide text-ink-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Waktu
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Aksi
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Target Paket
                    </th>
                    <th scope="col" className="px-4 py-3">
                      File &amp; Hash
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Ringkasan
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preparedLogs.map(({ entry, actionMeta, statusMeta, formattedSummary, slugPath }) => (
                      <tr key={entry.id} className="align-top transition hover:bg-subtle/30">
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-ink-secondary">
                          <time dateTime={entry.createdAt} suppressHydrationWarning>
                            {formatDateTimeId(entry.createdAt)}
                          </time>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${actionMeta.className}`}
                          >
                            {actionMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold text-ink">{entry.targetLabel ?? "—"}</p>
                          {slugPath ? (
                            <code className="mt-0.5 inline-block font-mono text-[11px] text-ink-muted">
                              {slugPath}
                            </code>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {entry.fileName ? (
                            <p className="max-w-[200px] truncate font-medium text-ink">
                              {entry.fileName}
                            </p>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                          {entry.contentHash ? (
                            <code className="mt-0.5 inline-block font-mono text-[11px] text-ink-muted">
                              {entry.contentHash.slice(0, 8)}
                            </code>
                          ) : null}
                        </td>
                        <td className="max-w-[300px] px-4 py-3 text-xs leading-relaxed">
                          <p className="font-medium text-ink">{formattedSummary.headline}</p>
                          {formattedSummary.details.length > 0 ? (
                            <ul className="mt-1 space-y-0.5 text-[11px] text-ink-muted">
                              {formattedSummary.details.map((detail, idx) => (
                                <li key={`${entry.id}-d-${idx}`}>{detail}</li>
                              ))}
                            </ul>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="space-y-3 md:hidden">
            {preparedLogs.map(({ entry, actionMeta, statusMeta, formattedSummary, slugPath }) => (
                <article
                  key={entry.id}
                  className="space-y-2.5 rounded-[10px] border border-line-strong bg-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${actionMeta.className}`}
                    >
                      {actionMeta.label}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-ink">{entry.targetLabel ?? "—"}</p>
                    {slugPath ? (
                      <code className="font-mono text-[11px] text-ink-muted">{slugPath}</code>
                    ) : null}
                  </div>

                  <div className="rounded-md border border-line bg-canvas p-2.5 text-xs leading-relaxed">
                    <p className="font-medium text-ink">{formattedSummary.headline}</p>
                    {formattedSummary.details.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-[11px] text-ink-muted">
                        {formattedSummary.details.map((detail, idx) => (
                          <li key={`${entry.id}-m-${idx}`}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.fileName ? (
                        <span className="max-w-[180px] truncate font-medium text-ink-secondary">
                          {entry.fileName}
                        </span>
                      ) : null}
                      {entry.contentHash ? (
                        <code className="font-mono">{entry.contentHash.slice(0, 8)}</code>
                      ) : null}
                    </div>
                    <time
                      dateTime={entry.createdAt}
                      suppressHydrationWarning
                      className="tabular-nums"
                    >
                      {formatDateTimeId(entry.createdAt)}
                    </time>
                  </div>
                </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
