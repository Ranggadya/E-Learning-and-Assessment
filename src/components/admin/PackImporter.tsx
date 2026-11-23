"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ADMIN_BADGE_TONES } from "@/components/admin/admin-format";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconClipboardList,
  IconFileText,
  IconUpload,
} from "@/components/ui/Icons";
import { SUBTEST_KIND_LABEL, SUBTEST_UNIT } from "@/lib/assessment/constants";
import { formatDateTimeId, formatDurationLabel } from "@/lib/format";
import type { ImportedSubtestSummary, ImportSummary } from "@/types/admin";

type Stage = "idle" | "checking" | "previewed" | "importing" | "done";
type FocusTarget = "confirmation" | "rejected" | "errors" | null;

interface ApiResponse {
  summary?: ImportSummary;
  errors?: string[];
  requiresConfirmation?: boolean;
}

// HTTP Fetch headers require ISO-8859-1 (ByteString <= 0xFF) and forbid control chars.
function toSafeHeaderFileName(raw: string | undefined | null): string | null {
  if (!raw) {
    return null;
  }
  const cleaned = Array.from(raw)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127 && code <= 255;
    })
    .join("")
    .trim();
  return cleaned ? cleaned.slice(0, 180) : null;
}

function getSubtestImpactBadges(
  subtest: ImportedSubtestSummary,
  isExplanationMode: boolean,
): Array<{ label: string; className: string }> {
  const badges: Array<{ label: string; className: string }> = [];

  if (subtest.changeType === "baru") {
    badges.push({
      label: isExplanationMode ? "Pembahasan baru" : "Subtes baru",
      className: ADMIN_BADGE_TONES.emerald,
    });
  } else if (subtest.changeType === "identik") {
    badges.push({
      label: "Identik · dilewati",
      className: ADMIN_BADGE_TONES.neutral,
    });
  } else if (isExplanationMode) {
    badges.push({
      label: "Pembahasan ditimpa",
      className: ADMIN_BADGE_TONES.amber,
    });
    if ((subtest.existingDetailedOverwriteCount ?? 0) > 0) {
      badges.push({
        label: `${subtest.existingDetailedOverwriteCount} pembahasan rinci ditimpa`,
        className: ADMIN_BADGE_TONES.rose,
      });
    }
  } else {
    badges.push(
      subtest.changedQuestionCount > 0
        ? {
            label: `Soal diganti (${subtest.changedQuestionCount} berubah)`,
            className: ADMIN_BADGE_TONES.rose,
          }
        : {
            label: "Metadata/konfigurasi berubah",
            className: ADMIN_BADGE_TONES.amber,
          },
    );
    if (subtest.losesDetailedExplanations) {
      badges.push({
        label: `Kehilangan pembahasan rinci (${subtest.existingDetailedCount} → ${subtest.incomingDetailedCount})`,
        className: ADMIN_BADGE_TONES.rose,
      });
    }
    if (subtest.replacedAttemptCount > 0) {
      badges.push({
        label: `${subtest.replacedAttemptCount} riwayat terdampak`,
        className: ADMIN_BADGE_TONES.amber,
      });
    }
  }

  if (subtest.coverageMismatch) {
    badges.push({
      label: `Cakupan tidak sama (${subtest.questionCount}/${subtest.existingQuestionCount})`,
      className: ADMIN_BADGE_TONES.amber,
    });
  }

  return badges;
}

async function sendPack(
  jsonText: string,
  options: { dryRun: boolean; force?: boolean; fileName?: string },
): Promise<{ status: number; body: ApiResponse }> {
  const params = new URLSearchParams();
  if (options.dryRun) {
    params.set("dryRun", "1");
  } else if (options.force) {
    params.set("force", "1");
  }
  const queryString = params.toString();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const safeFileName = toSafeHeaderFileName(options.fileName);
  if (safeFileName) {
    headers["X-Import-Filename"] = safeFileName;
  }

  const response = await fetch(`/api/admin/packs${queryString ? `?${queryString}` : ""}`, {
    method: "POST",
    headers,
    body: jsonText,
  });
  const body = (await response.json().catch(function onInvalidBody() {
    return { errors: ["Respons server tidak dikenali"] };
  })) as ApiResponse;
  return { status: response.status, body };
}

export function PackImporter() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const confirmationPanelRef = useRef<HTMLDivElement | null>(null);
  const rejectedNoticeRef = useRef<HTMLDivElement | null>(null);
  const errorsAlertRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusRef = useRef<FocusTarget>(null);

  const [jsonText, setJsonText] = useState<string>("");
  const [fileMeta, setFileMeta] = useState<{ name: string; sizeKb: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [forceConfirmed, setForceConfirmed] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectedNotice, setRejectedNotice] = useState<string | null>(null);

  useEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) {
      return;
    }
    pendingFocusRef.current = null;
    const element =
      target === "confirmation"
        ? confirmationPanelRef.current
        : target === "rejected"
          ? rejectedNoticeRef.current
          : errorsAlertRef.current;
    element?.focus();
  }, [stage, summary, errors, rejectedNotice]);

  function resetResult() {
    pendingFocusRef.current = null;
    setStage("idle");
    setSummary(null);
    setErrors([]);
    setForceConfirmed(false);
    setRejectedNotice(null);
  }

  async function loadFile(file: File) {
    setFileMeta({ name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)) });
    setJsonText(await file.text());
    resetResult();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (isBusy || isRejecting) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await loadFile(file);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isBusy || isRejecting) {
      return;
    }
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    await loadFile(file);
  }

  async function handleCheck() {
    setStage("checking");
    setErrors([]);
    setSummary(null);
    setForceConfirmed(false);
    setRejectedNotice(null);
    try {
      const { body } = await sendPack(jsonText, { dryRun: true, fileName: fileMeta?.name });
      if (body.summary) {
        setSummary(body.summary);
        setStage("previewed");
      } else {
        pendingFocusRef.current = "errors";
        setErrors(body.errors ?? ["Pemeriksaan gagal"]);
        setStage("idle");
      }
    } catch {
      pendingFocusRef.current = "errors";
      setErrors(["Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi."]);
      setStage("idle");
    }
  }

  async function handleImport(force = false) {
    setStage("importing");
    setErrors([]);
    setRejectedNotice(null);
    try {
      const { status, body } = await sendPack(jsonText, {
        dryRun: false,
        force,
        fileName: fileMeta?.name,
      });

      if (status === 409 && body.summary) {
        pendingFocusRef.current = "confirmation";
        setSummary(body.summary);
        setForceConfirmed(false);
        setErrors(
          body.errors && body.errors.length > 0
            ? body.errors
            : ["Konfirmasi timpa paksa diperlukan sebelum menyimpan."],
        );
        setStage("previewed");
        return;
      }

      if (status >= 200 && status < 300 && body.summary) {
        setSummary(body.summary);
        setForceConfirmed(false);
        setErrors([]);
        setStage("done");
        return;
      }

      pendingFocusRef.current = "errors";
      setErrors(body.errors ?? ["Impor gagal"]);
      setStage("previewed");
    } catch {
      pendingFocusRef.current = "errors";
      setErrors(["Tidak bisa menghubungi server. Tidak ada data yang berubah."]);
      setStage("previewed");
    }
  }

  async function handleReject() {
    if (!summary || isBusy || isRejecting) {
      return;
    }
    setIsRejecting(true);
    let logged = false;
    try {
      const response = await fetch("/api/admin/packs/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: summary.mode === "pembahasan" ? "pembahasan" : "pack",
          companySlug: summary.companySlug,
          packageSlug: summary.packageSlug,
          targetLabel: `${summary.companyName} / ${summary.packageName}`,
          fileName: fileMeta?.name ?? null,
          contentHash: summary.contentHash,
          warnings: summary.warnings,
        }),
      });
      logged = response.ok;
    } catch {
      // Penolakan UI tetap berlanjut, namun pesan mencerminkan kegagalan pencatatan.
    } finally {
      pendingFocusRef.current = "rejected";
      setIsRejecting(false);
      setStage("idle");
      setSummary(null);
      setErrors([]);
      setForceConfirmed(false);
      setRejectedNotice(
        logged
          ? "Impor dibatalkan dan dicatat di Audit Log."
          : "Impor dibatalkan (gagal mencatat ke Audit Log).",
      );
    }
  }

  const isBusy = stage === "checking" || stage === "importing";
  const replacedAttempts = summary
    ? summary.subtests.reduce((total, subtest) => total + subtest.replacedAttemptCount, 0)
    : 0;
  const isExplanationMode = summary?.mode === "pembahasan";
  const isDestructiveWarning = Boolean(
    summary &&
      (summary.hasOverwrite ||
        summary.subtests.some((subtest) => subtest.losesDetailedExplanations) ||
        replacedAttempts > 0),
  );
  const subtestDiffRows = summary
    ? summary.subtests.map((subtest) => ({
        subtest,
        unit: SUBTEST_UNIT[subtest.kind] ?? "soal",
        impactBadges: getSubtestImpactBadges(subtest, isExplanationMode),
        isNewSubtest: subtest.changeType === "baru" && !isExplanationMode,
      }))
    : [];

  const activeStep = stage === "done" ? 3 : stage === "previewed" || stage === "importing" ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* 3-Step Status Bar */}
      <ol
        aria-label="Tahapan impor"
        className="grid grid-cols-1 gap-2 rounded-[10px] border border-line-strong bg-surface p-2 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none sm:grid-cols-3"
      >
        {[
          { step: 1, label: "1. Muat JSON" },
          { step: 2, label: "2. Pratinjau & Integritas" },
          { step: 3, label: "3. Tersimpan" },
        ].map((item) => {
          const isCurrent = activeStep === item.step;
          const isDone = activeStep > item.step;
          return (
            <li
              key={item.step}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-center transition ${
                isCurrent
                  ? "bg-brand font-bold text-white shadow-xs"
                  : isDone
                    ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "font-medium text-ink-muted"
              }`}
            >
              {isDone ? <IconCheckCircle className="h-3.5 w-3.5 shrink-0" /> : null}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Input Panel */}
      <div className="rounded-[10px] border border-line-strong bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none sm:p-6">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
            isDragging
              ? "border-brand bg-brand-soft/60"
              : "border-line-strong bg-canvas/60 hover:border-brand/60"
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-brand-text shadow-xs">
            <IconUpload className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">
            Seret file paket atau pembahasan <code className="font-mono">.json</code> ke sini
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Maksimal 8 MB · Mendukung file paket soal lengkap maupun file{" "}
            <code className="font-mono">pembahasanSaja</code>
          </p>
          <input
            ref={fileInputRef}
            id="pack-file"
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="sr-only"
          />
          <button
            type="button"
            disabled={isBusy || isRejecting}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-lg border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-subtle disabled:opacity-50"
          >
            Pilih file dari komputer
          </button>

          {fileMeta ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs text-ink-secondary">
              <IconFileText className="h-3.5 w-3.5 text-brand-text" />
              <span className="font-medium text-ink">{fileMeta.name}</span>
              <span className="font-mono tabular-nums text-ink-muted">({fileMeta.sizeKb} KB)</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label htmlFor="pack-text" className="text-sm font-semibold text-ink">
              Atau tempel isi JSON langsung
            </label>
            {jsonText ? (
              <button
                type="button"
                disabled={isBusy || isRejecting}
                onClick={() => {
                  setJsonText("");
                  setFileMeta(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                  resetResult();
                }}
                className="text-xs font-semibold text-ink-muted transition hover:text-ink disabled:opacity-50"
              >
                Bersihkan
              </button>
            ) : null}
          </div>
          <textarea
            id="pack-text"
            disabled={isBusy || isRejecting}
            value={jsonText}
            onChange={(event) => {
              setJsonText(event.target.value);
              setFileMeta(null);
              resetResult();
            }}
            rows={9}
            spellCheck={false}
            className="mt-1.5 w-full rounded-lg border border-line-strong bg-canvas p-3.5 font-mono text-xs leading-relaxed text-ink placeholder:text-ink-muted transition focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            placeholder='{"company": {"slug": "...", "name": "..."}, "package": {...}, "subtests": [...]}'
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCheck}
            disabled={isBusy || isRejecting || jsonText.trim() === ""}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {stage === "checking" ? "Memeriksa..." : "Periksa dulu"}
          </button>
          <span className="text-xs text-ink-muted">
            Pemeriksaan menjalankan dry-run transaksi untuk menganalisis diff dan duplikasi tanpa
            mengubah database.
          </span>
        </div>
      </div>

      {/* Cancellation Notice */}
      {rejectedNotice ? (
        <div
          ref={rejectedNoticeRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="scroll-mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line-strong bg-surface px-5 py-4 text-sm text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none"
        >
          <div className="flex items-center gap-2.5">
            <IconClipboardList className="h-4 w-4 shrink-0 text-brand-text" />
            <span className="font-medium">{rejectedNotice}</span>
          </div>
          <Link
            href="/admin/audit"
            className="text-xs font-bold text-brand-text hover:underline"
          >
            Lihat Audit Log
          </Link>
        </div>
      ) : null}

      {/* Validation / Server Errors */}
      {errors.length > 0 ? (
        <div
          ref={errorsAlertRef}
          tabIndex={-1}
          role="alert"
          className="scroll-mt-6 rounded-[10px] border border-rose-300 bg-rose-50 p-5 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-100"
        >
          <div className="flex items-center gap-2 font-semibold">
            <IconAlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {errors.length === 1
                ? "Perlu perhatian sebelum melanjutkan:"
                : `File belum bisa diimpor (${errors.length} kesalahan):`}
            </span>
          </div>
          <ul className="mt-2.5 list-disc space-y-1 pl-5 text-xs leading-relaxed">
            {errors.map((error, idx) => (
              <li key={`${idx}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Preview / Done Summary */}
      {summary ? (
        <div className="overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-subtle/60 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {stage === "done" ? (
                <IconCheckCircle className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
              ) : null}
              <h2 className="text-base font-bold text-ink">
                {stage === "done"
                  ? isExplanationMode
                    ? "Pembahasan berhasil disimpan"
                    : "Paket berhasil diimpor"
                  : "Pratinjau & Integritas (belum disimpan)"}
              </h2>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${ADMIN_BADGE_TONES.brand}`}>
                {isExplanationMode ? "Pembahasan Saja" : "Paket Soal"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span className="rounded border border-line-strong bg-surface px-2 py-0.5 font-mono text-ink-secondary">
                hash:{summary.contentHash.slice(0, 8)}
              </span>
              {summary.previousUploadAt ? (
                <span
                  suppressHydrationWarning
                  className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 font-medium text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/60 dark:text-amber-200"
                >
                  Pernah diunggah: {formatDateTimeId(summary.previousUploadAt)}
                </span>
              ) : null}
              <span className="font-mono tabular-nums">
                {summary.subtests.length} subtes · {summary.totalQuestions}{" "}
                {isExplanationMode ? "butir" : "item"}
              </span>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {/* Target Package Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                <span className="text-xs font-medium text-ink-muted">Perusahaan</span>
                <p className="mt-0.5 font-bold text-ink">
                  {summary.companyName}{" "}
                  <span className="text-xs font-medium text-ink-muted">
                    ({summary.companyStatus})
                  </span>
                </p>
                <code className="mt-1 inline-block font-mono text-xs text-ink-muted">
                  {summary.companySlug}
                </code>
              </div>
              <div className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                <span className="text-xs font-medium text-ink-muted">Paket</span>
                <p className="mt-0.5 font-bold text-ink">
                  {summary.packageName}{" "}
                  <span className="text-xs font-medium text-ink-muted">
                    ({summary.packageStatus})
                  </span>
                </p>
                <code className="mt-1 inline-block font-mono text-xs text-ink-muted">
                  {summary.packageSlug}
                </code>
              </div>
            </div>

            {/* Per-Subtest Diff Table (Desktop) + Cards (Mobile) */}
            <div className="overflow-hidden rounded-lg border border-line-strong">
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-subtle/70 text-xs font-bold uppercase tracking-wide text-ink-secondary">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">
                        Subtes
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Kondisi Database
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        File Diunggah
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Dampak
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {subtestDiffRows.map(({ subtest, unit, impactBadges, isNewSubtest }) => (
                        <tr key={subtest.slug} className="align-top transition hover:bg-subtle/30">
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-ink">{subtest.name}</span>
                              {subtest.kind !== "QUIZ" ? (
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${ADMIN_BADGE_TONES.brand}`}
                                >
                                  {SUBTEST_KIND_LABEL[subtest.kind]}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                              <code className="font-mono">{subtest.slug}</code>
                              <span className="tabular-nums">
                                · {formatDurationLabel(subtest.durationSeconds)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums text-ink-secondary">
                            {isNewSubtest ? (
                              <span className="text-ink-muted">Belum ada di database</span>
                            ) : (
                              <div>
                                <p className="font-semibold text-ink">
                                  {subtest.existingQuestionCount} {unit}
                                </p>
                                {subtest.kind === "QUIZ" ? (
                                  <p className="mt-0.5 text-ink-muted">
                                    {subtest.existingDetailedCount} pembahasan rinci
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums text-ink-secondary">
                            <p className="font-semibold text-ink">
                              {subtest.questionCount} {unit}
                            </p>
                            {subtest.kind === "QUIZ" ? (
                              <p className="mt-0.5 text-ink-muted">
                                {subtest.incomingDetailedCount} pembahasan rinci
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {impactBadges.map((badge) => (
                                <span
                                  key={badge.label}
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <ul className="divide-y divide-line md:hidden">
                {subtestDiffRows.map(({ subtest, unit, impactBadges, isNewSubtest }) => (
                    <li key={subtest.slug} className="space-y-2.5 p-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-ink">{subtest.name}</span>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-ink-muted">
                            <code className="font-mono">{subtest.slug}</code>
                            <span>· {formatDurationLabel(subtest.durationSeconds)}</span>
                          </div>
                        </div>
                        {subtest.kind !== "QUIZ" ? (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${ADMIN_BADGE_TONES.brand}`}
                          >
                            {SUBTEST_KIND_LABEL[subtest.kind]}
                          </span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-canvas p-2.5 tabular-nums">
                        <div>
                          <span className="block text-[11px] font-medium text-ink-muted">
                            Kondisi Database
                          </span>
                          {isNewSubtest ? (
                            <span className="font-medium text-ink-muted">Belum ada</span>
                          ) : (
                            <>
                              <span className="font-semibold text-ink">
                                {subtest.existingQuestionCount} {unit}
                              </span>
                              {subtest.kind === "QUIZ" ? (
                                <span className="block text-[11px] text-ink-muted">
                                  {subtest.existingDetailedCount} rinci
                                </span>
                              ) : null}
                            </>
                          )}
                        </div>
                        <div>
                          <span className="block text-[11px] font-medium text-ink-muted">
                            File Diunggah
                          </span>
                          <span className="font-semibold text-ink">
                            {subtest.questionCount} {unit}
                          </span>
                          {subtest.kind === "QUIZ" ? (
                            <span className="block text-[11px] text-ink-muted">
                              {subtest.incomingDetailedCount} rinci
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {impactBadges.map((badge) => (
                          <span
                            key={badge.label}
                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </li>
                ))}
              </ul>
            </div>

            {/* Spot-Check Panel for Explanation Mode */}
            {isExplanationMode && summary.spotChecks && summary.spotChecks.length > 0 ? (
              <section
                aria-label="Cek kecocokan sampel soal"
                className="rounded-lg border border-line-strong bg-canvas p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-ink">Cek Kecocokan Sampel Soal</h3>
                  <span className="text-xs text-ink-muted">
                    Pastikan pembahasan cocok dengan teks soal &amp; kunci jawaban di database
                  </span>
                </div>
                <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
                  {summary.spotChecks.map((spot) => (
                    <li
                      key={`${spot.subtestSlug}-${spot.number}`}
                      className="rounded-lg border border-line bg-surface p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-ink">
                          {spot.subtestName} · Soal #{spot.number}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${ADMIN_BADGE_TONES.brand}`}
                          >
                            Kunci DB: {spot.correctOption}
                          </span>
                          {spot.alreadyHasDetailed ? (
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${ADMIN_BADGE_TONES.amber}`}
                            >
                              Sudah ada pembahasan rinci
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2 space-y-1.5 leading-relaxed">
                        <p className="text-ink-secondary">
                          <span className="font-semibold text-ink">Soal DB:</span>{" "}
                          {spot.dbPromptSnippet}
                        </p>
                        <p className="text-ink-secondary">
                          <span className="font-semibold text-ink">Pembahasan masuk:</span>{" "}
                          {spot.incomingSnippet || "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Confirmation Gate (Duplicate / Overwrite / Coverage Mismatch) */}
            {summary.requiresConfirmation && stage !== "done" ? (
              <div
                ref={confirmationPanelRef}
                tabIndex={-1}
                role="region"
                aria-labelledby="force-confirm-heading"
                className={`scroll-mt-6 space-y-4 rounded-lg border p-4 sm:p-5 ${
                  isDestructiveWarning
                    ? "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800/80 dark:bg-rose-950/50 dark:text-rose-100"
                    : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/50 dark:text-amber-100"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <h3 id="force-confirm-heading" className="text-sm font-bold">
                      Konfirmasi Timpa Paksa Diperlukan
                    </h3>
                    {summary.warnings.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">
                        {summary.warnings.map((warning, idx) => (
                          <li key={`${idx}-${warning}`}>{warning}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs leading-relaxed">
                        Impor ini berpotensi menimpa atau menduplikasi data yang sudah ada di
                        database.
                      </p>
                    )}
                  </div>
                </div>

                <label
                  htmlFor="force-overwrite-confirm"
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-current/20 bg-surface/85 px-3.5 py-2.5 text-xs font-semibold text-ink"
                >
                  <input
                    id="force-overwrite-confirm"
                    type="checkbox"
                    checked={forceConfirmed}
                    disabled={isBusy || isRejecting}
                    onChange={(event) => setForceConfirmed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line-strong text-brand accent-brand"
                  />
                  <span>
                    Saya memahami dampak penimpaan ini dan tetap ingin melanjutkan impor.
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isBusy || isRejecting}
                    onClick={handleReject}
                    className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRejecting ? "Membatalkan..." : "Tolak / Batalkan Impor"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || isRejecting || !forceConfirmed}
                    onClick={() => handleImport(true)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {stage === "importing"
                      ? "Menyimpan paksa..."
                      : "Timpa Paksa (Force Overwrite)"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Clean Import Action */}
            {!summary.requiresConfirmation && stage !== "done" ? (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleImport(false)}
                  disabled={isBusy || isRejecting}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {stage === "importing" ? "Menyimpan..." : "Simpan ke Database"}
                </button>
              </div>
            ) : null}

            {/* Done State */}
            {stage === "done" ? (
              <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-100">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <IconCheckCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Perubahan berhasil disimpan ke database dan dicatat di Audit Log.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/admin"
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-brand-hover"
                  >
                    Kembali ke Paket Soal
                  </Link>
                  <Link
                    href="/admin/audit"
                    className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
                  >
                    Lihat Audit Log
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
