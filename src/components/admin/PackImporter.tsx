"use client";

import { useState } from "react";
import Link from "next/link";
import type { ImportSummary } from "@/lib/pack-import";

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
  const [jsonText, setJsonText] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  function resetResult() {
    setStage("idle");
    setSummary(null);
    setErrors([]);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setFileName(file.name);
    setJsonText(await file.text());
    resetResult();
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
      setErrors(["Tidak bisa menghubungi server"]);
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
      setErrors(["Tidak bisa menghubungi server"]);
      setStage("previewed");
    }
  }

  const isBusy = stage === "checking" || stage === "importing";
  const replacedAttempts = summary
    ? summary.subtests.reduce(function sumAttempts(total, subtest) {
        return total + subtest.replacedAttemptCount;
      }, 0)
    : 0;

  return (
    <div className="mt-6">
      <label htmlFor="pack-file" className="block text-sm font-medium">
        File paket (.json)
      </label>
      <input
        id="pack-file"
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="mt-1 block w-full text-sm"
      />
      {fileName ? <p className="mt-1 text-xs text-slate-500">Dipilih: {fileName}</p> : null}

      <label htmlFor="pack-text" className="mt-5 block text-sm font-medium">
        Atau tempel isi JSON
      </label>
      <textarea
        id="pack-text"
        value={jsonText}
        onChange={function onChange(event) {
          setJsonText(event.target.value);
          setFileName(null);
          resetResult();
        }}
        rows={8}
        spellCheck={false}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent p-3 font-mono text-xs dark:border-slate-600"
        placeholder='{"company": {...}, "package": {...}, "subtests": [...]}'
      />

      <button
        type="button"
        onClick={handleCheck}
        disabled={isBusy || jsonText.trim() === ""}
        className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
      >
        {stage === "checking" ? "Memeriksa..." : "Periksa dulu"}
      </button>

      {errors.length > 0 ? (
        <div role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">File belum bisa diimpor:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map(function renderError(error) {
              return <li key={error}>{error}</li>;
            })}
          </ul>
        </div>
      ) : null}

      {summary ? (
        <div className="mt-5 rounded-lg border border-slate-300 p-4 text-sm dark:border-slate-600">
          <p className="font-semibold">
            {stage === "done" ? "Berhasil diimpor" : "Pratinjau (belum disimpan)"}
          </p>
          <p className="mt-1">
            {summary.companyName} ({summary.companyStatus}) · {summary.packageName} ({summary.packageStatus}) ·{" "}
            {summary.subtests.length} subtes · {summary.totalQuestions} soal
          </p>
          <ul className="mt-3 space-y-1">
            {summary.subtests.map(function renderSubtest(subtest) {
              return (
                <li key={subtest.slug}>
                  {subtest.name}: {subtest.questionCount} soal, {Math.round(subtest.durationSeconds / 60)} menit{" "}
                  <span className={subtest.status === "baru" ? "text-emerald-700" : "text-amber-700"}>
                    ({subtest.status === "baru" ? "baru" : "soal lama diganti"})
                  </span>
                </li>
              );
            })}
          </ul>
          {replacedAttempts > 0 ? (
            <p className="mt-3 text-xs text-amber-700">
              Perhatian: {replacedAttempts} riwayat pengerjaan pada subtes yang diganti akan kehilangan detail jawabannya (skor tetap tercatat).
            </p>
          ) : null}

          {stage === "previewed" || stage === "importing" ? (
            <button
              type="button"
              onClick={handleImport}
              disabled={isBusy}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {stage === "importing" ? "Mengimpor..." : "Impor sekarang"}
            </button>
          ) : null}
          {stage === "done" ? (
            <Link href="/admin" className="mt-4 inline-block text-blue-600 hover:underline">
              Kembali ke dashboard
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
