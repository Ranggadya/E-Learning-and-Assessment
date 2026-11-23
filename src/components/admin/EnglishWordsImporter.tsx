"use client";

import { useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconFileText,
  IconUpload,
} from "@/components/ui/Icons";

export function EnglishWordsImporter() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [resultCount, setResultCount] = useState<number | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setJsonText(await file.text());
    setErrors([]);
    setResultCount(null);
  }

  async function handleUpload() {
    if (!jsonText.trim() || loading) return;
    setLoading(true);
    setErrors([]);
    setResultCount(null);
    try {
      const res = await fetch("/api/admin/english", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonText,
      });
      const data = (await res.json()) as {
        upsertedCount?: number;
        errors?: string[];
      };
      if (!res.ok) {
        setErrors(data.errors ?? ["Impor kamus gagal."]);
      } else {
        setResultCount(data.upsertedCount ?? 0);
      }
    } catch {
      setErrors(["Gagal menghubungi server."]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="Impor Kamus Bahasa Inggris"
      className="space-y-4 rounded-[10px] border border-line-strong bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none sm:p-6"
    >
      <div>
        <span className="inline-flex items-center rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-text">
          Materi Bahasa Inggris
        </span>
        <h2 className="mt-1.5 text-lg font-extrabold text-ink">
          Impor / Perbarui Kamus Bahasa Inggris (Upsert by <code className="font-mono">no</code>)
        </h2>
        <p className="mt-1 text-xs text-ink-secondary">
          Unggah file JSON dengan format <code className="font-mono">{`[{no, word, pos, meaning_id, example_en, example_id, cefr}]`}</code>. Kata dengan <code className="font-mono">no</code> yang sama akan diperbarui tanpa menghapus progres kotak pengguna.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-canvas px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
        >
          <IconUpload className="h-3.5 w-3.5" />
          <span>Pilih File JSON Kamus</span>
        </button>
        {fileName ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
            <IconFileText className="h-3.5 w-3.5 text-brand-text" />
            <span>{fileName}</span>
          </span>
        ) : null}
      </div>

      <textarea
        value={jsonText}
        onChange={(e) => {
          setJsonText(e.target.value);
          setResultCount(null);
          setErrors([]);
        }}
        rows={5}
        spellCheck={false}
        placeholder='[{"no": 1, "word": "about", "pos": "preposition", "meaning_id": "tentang", "example_en": "...", "example_id": "...", "cefr": "A1"}]'
        className="w-full rounded-lg border border-line-strong bg-canvas p-3 font-mono text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={loading || jsonText.trim() === ""}
          onClick={handleUpload}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-45"
        >
          {loading ? "Mengimpor..." : "Unggah & Upsert Kamus"}
        </button>
      </div>

      {resultCount !== null ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
        >
          <IconCheckCircle className="h-4 w-4 shrink-0" />
          <span>Berhasil menyimpan / memperbarui {resultCount} kata ke tabel english_words.</span>
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-xs text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-100"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <IconAlertTriangle className="h-4 w-4 shrink-0" />
            <span>Gagal mengimpor kamus:</span>
          </div>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
