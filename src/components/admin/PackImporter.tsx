"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconFileText,
  IconUpload,
} from "@/components/ui/Icons";
import type { ImportSummary } from "@/lib/pack-import";
import { SUBTEST_UNIT } from "@/lib/types";

type Stage = "idle" | "checking" | "previewed" | "importing" | "done";

interface ApiResponse {
  summary?: ImportSummary;
  errors?: string[];
}

async function sendPack(jsonText: string, dryRun: boolean): Promise<{ status: number; body: ApiResponse }> {
  const response = await fetch(`/api/admin/packs${dryRun ? "?dryRun=1" : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: jsonText,
  });
  const body = (await response.json().catch(function onInvalidBody() {
    return { errors: ["Respons server tidak dikenali"] };
  })) as ApiResponse;
  return { status: response.status, body };
}

export function PackImporter() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [jsonText, setJsonText] = useState<string>("");
  const [fileMeta, setFileMeta] = useState<{ name: string; sizeKb: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  function resetResult() {
    setStage("idle");
    setSummary(null);
    setErrors([]);
  }

  async function loadFile(file: File) {
    setFileMeta({ name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)) });
    setJsonText(await file.text());
    resetResult();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await loadFile(file);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
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
    try {
      const { body } = await sendPack(jsonText, true);
      if (body.summary) {
        setSummary(body.summary);
        setStage("previewed");
      } else {
        setErrors(body.errors ?? ["Pemeriksaan gagal"]);
        setStage("idle");
      }
    } catch {
      setErrors(["Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi."]);
      setStage("idle");
    }
  }

  async function handleImport() {
    setStage("importing");
    try {
      const { body } = await sendPack(jsonText, false);
      if (body.summary) {
        setSummary(body.summary);
        setStage("done");
      } else {
        setErrors(body.errors ?? ["Impor gagal"]);
        setStage("previewed");
      }
    } catch {
      setErrors(["Tidak bisa menghubungi server. Tidak ada data yang berubah."]);
      setStage("previewed");
    }
  }

  const isBusy = stage === "checking" || stage === "importing";
  const replacedAttempts = summary
    ? summary.subtests.reduce((total, subtest) => total + subtest.replacedAttemptCount, 0)
    : 0;

  const activeStep = stage === "done" ? 3 : stage === "previewed" || stage === "importing" ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* 3-Step Status Bar */}
      <ol className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface p-2 text-xs font-medium">
        {[
          { step: 1, label: "1. Muat JSON" },
          { step: 2, label: "2. Pratinjau & Validasi" },
          { step: 3, label: "3. Tersimpan" },
        ].map((item) => {
          const isCurrent = activeStep === item.step;
          const isDone = activeStep > item.step;
          return (
            <li
              key={item.step}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-center transition ${isCurrent
                ? "bg-brand-soft font-semibold text-brand-text"
                : isDone
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-ink-muted"
                }`}
            >
              {isDone ? <IconCheckCircle className="h-3.5 w-3.5 shrink-0" /> : null}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Input Panel */}
      <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${isDragging
            ? "border-brand bg-brand-soft/60"
            : "border-line-strong bg-canvas/60 hover:border-brand/60"
            }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-brand-text shadow-xs border border-line">
            <IconUpload className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">
            Seret file paket <code className="font-mono">.json</code> ke sini
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Maksimal 8 MB · Satu file memuat satu paket milik satu perusahaan
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
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-lg border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-subtle"
          >
            Pilih file dari komputer
          </button>

          {fileMeta ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-secondary">
              <IconFileText className="h-3.5 w-3.5 text-brand-text" />
              <span className="font-medium text-ink">{fileMeta.name}</span>
              <span className="font-mono tabular-nums text-ink-muted">({fileMeta.sizeKb} KB)</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label htmlFor="pack-text" className="text-sm font-medium text-ink">
              Atau tempel isi JSON langsung
            </label>
            {jsonText ? (
              <button
                type="button"
                onClick={() => {
                  setJsonText("");
                  setFileMeta(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                  resetResult();
                }}
                className="text-xs font-medium text-ink-muted hover:text-ink"
              >
                Bersihkan
              </button>
            ) : null}
          </div>
          <textarea
            id="pack-text"
            value={jsonText}
            onChange={(event) => {
              setJsonText(event.target.value);
              setFileMeta(null);
              resetResult();
            }}
            rows={9}
            spellCheck={false}
            className="mt-1.5 w-full rounded-lg border border-line-strong bg-canvas p-3.5 font-mono text-xs leading-relaxed text-ink placeholder:text-ink-muted transition focus:border-brand focus:outline-none"
            placeholder='{"company": {"slug": "...", "name": "..."}, "package": {...}, "subtests": [...]}'
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCheck}
            disabled={isBusy || jsonText.trim() === ""}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {stage === "checking" ? "Memeriksa..." : "Periksa dulu"}
          </button>
          <span className="text-xs text-ink-muted">
            Pemeriksaan menjalankan dry-run transaksi tanpa mengubah isi database.
          </span>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 ? (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
        >
          <div className="flex items-center gap-2 font-semibold">
            <IconAlertTriangle className="h-4 w-4 shrink-0" />
            <span>File belum bisa diimpor ({errors.length} kesalahan):</span>
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
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
            <div className="flex items-center gap-2">
              {stage === "done" ? (
                <IconCheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : null}
              <h2 className="text-base font-semibold text-ink">
                {stage === "done" ? "Paket berhasil diimpor" : "Pratinjau impor (belum disimpan)"}
              </h2>
            </div>
            <span className="font-mono text-xs tabular-nums text-ink-muted">
              {summary.subtests.length} subtes · {summary.totalQuestions} soal
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                <span className="text-xs text-ink-muted">Perusahaan</span>
                <p className="mt-0.5 font-semibold text-ink">
                  {summary.companyName}{" "}
                  <span className="text-xs font-medium text-ink-muted">({summary.companyStatus})</span>
                </p>
              </div>
              <div className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                <span className="text-xs text-ink-muted">Paket</span>
                <p className="mt-0.5 font-semibold text-ink">
                  {summary.packageName}{" "}
                  <span className="text-xs font-medium text-ink-muted">({summary.packageStatus})</span>
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-line">
              <ul className="divide-y divide-line text-sm">
                {summary.subtests.map((subtest) => (
                  <li key={subtest.slug} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div>
                      <span className="font-medium text-ink">{subtest.name}</span>
                      <span className="ml-2 text-xs text-ink-muted tabular-nums">
                        {subtest.questionCount} {SUBTEST_UNIT[subtest.kind] ?? "soal"} · {Math.max(1, Math.round(subtest.durationSeconds / 60))} menit
                      </span>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${summary.mode === "pembahasan" || subtest.status === "baru"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                    >
                      {summary.mode === "pembahasan"
                        ? "Pembahasan diperbarui"
                        : subtest.status === "baru"
                          ? "Subtes baru"
                          : "Soal lama diganti"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {replacedAttempts > 0 ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200">
                <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Perhatian: <strong className="tabular-nums">{replacedAttempts} riwayat pengerjaan</strong> pada subtes yang diganti akan kehilangan detail jawabannya (skor akhir tetap tercatat).
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {stage === "previewed" || stage === "importing" ? (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isBusy}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
                >
                  {stage === "importing" ? "Mengimpor..." : "Impor sekarang"}
                </button>
              ) : null}
              {stage === "done" ? (
                <Link
                  href="/admin"
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
                >
                  Kembali ke Dashboard Admin
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
