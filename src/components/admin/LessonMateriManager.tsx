"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconExternalLink,
  IconFileText,
  IconTrash,
  IconUpload,
} from "@/components/ui/Icons";
import { LESSON_LEVEL_LABEL, LESSON_ORIGIN_LABEL } from "@/lib/belajar/constants";
import type {
  AdminLessonRow,
  LessonStatus,
  LessonValidationItem,
} from "@/types/belajar";

interface LessonMateriManagerProps {
  initialTracks: Array<{
    id: number;
    slug: string;
    title: string;
    description: string | null;
    sortOrder: number;
  }>;
  initialLessons: AdminLessonRow[];
}

export function LessonMateriManager({
  initialTracks,
  initialLessons,
}: LessonMateriManagerProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<Array<{ fileName: string; content: string }>>([]);
  const [previewItems, setPreviewItems] = useState<LessonValidationItem[] | null>(null);
  const [previewOk, setPreviewOk] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const [trackSlug, setTrackSlug] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [trackDesc, setTrackDesc] = useState("");
  const [trackOrder, setTrackOrder] = useState(String(initialTracks.length + 1));
  const [savingTrack, setSavingTrack] = useState(false);

  const [filterTrack, setFilterTrack] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [busyLessonId, setBusyLessonId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  async function runPreview(files: Array<{ fileName: string; content: string }>) {
    if (files.length === 0) return;
    setLoading(true);
    setErrors([]);
    setImportedCount(null);
    try {
      const res = await fetch("/api/admin/belajar?dryRun=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: LessonValidationItem[];
        errors?: string[];
      };
      setPreviewItems(data.items ?? null);
      setPreviewOk(Boolean(data.ok));
      setErrors(data.errors ?? []);
    } catch {
      setErrors(["Gagal menghubungi server untuk pratinjau validasi."]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const loaded: Array<{ fileName: string; content: string }> = [];
    for (const file of Array.from(fileList)) {
      loaded.push({ fileName: file.name, content: await file.text() });
    }
    setSelectedFiles(loaded);
    await runPreview(loaded);
    e.target.value = "";
  }

  async function handleImport() {
    if (selectedFiles.length === 0 || !previewOk || loading) return;
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch("/api/admin/belajar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: selectedFiles }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        upsertedCount?: number;
        errors?: string[];
      };
      if (!res.ok || !data.ok) {
        setErrors(data.errors ?? ["Impor pelajaran gagal."]);
      } else {
        setImportedCount(data.upsertedCount ?? selectedFiles.length);
        setSelectedFiles([]);
        setPreviewItems(null);
        setPreviewOk(false);
        router.refresh();
      }
    } catch {
      setErrors(["Gagal menghubungi server saat menyimpan pelajaran."]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!trackSlug.trim() || !trackTitle.trim() || savingTrack) return;
    setSavingTrack(true);
    setErrors([]);
    try {
      const res = await fetch("/api/admin/belajar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "track",
          slug: trackSlug.trim(),
          title: trackTitle.trim(),
          description: trackDesc.trim(),
          sortOrder: Number(trackOrder) || 1,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; errors?: string[] };
      if (!res.ok) {
        setErrors(data.errors ?? ["Gagal menyimpan jalur."]);
      } else {
        setTrackSlug("");
        setTrackTitle("");
        setTrackDesc("");
        router.refresh();
      }
    } finally {
      setSavingTrack(false);
    }
  }

  async function handleToggleStatus(lessonId: number, currentStatus: LessonStatus) {
    const nextStatus: LessonStatus = currentStatus === "reviewed" ? "draft" : "reviewed";
    setBusyLessonId(lessonId);
    try {
      const res = await fetch(`/api/admin/belajar/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setBusyLessonId(null);
    }
  }

  async function handleDeleteLesson(lessonId: number) {
    setBusyLessonId(lessonId);
    try {
      const res = await fetch(`/api/admin/belajar/${lessonId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        router.refresh();
      }
    } finally {
      setBusyLessonId(null);
    }
  }

  const filteredLessons = initialLessons.filter((l) => {
    if (filterTrack && l.trackSlug !== filterTrack) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Panel Impor Multi-File Markdown */}
      <section
        aria-label="Impor File Markdown Pelajaran"
        className="space-y-4 rounded-xl border border-line-strong bg-surface p-5 sm:p-6"
      >
        <div>
          <span className="inline-flex items-center rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-text">
            Roadmap Software Engineer
          </span>
          <h2 className="mt-1.5 text-lg font-extrabold text-ink">
            Impor Pelajaran Markdown (<code className="font-mono">.md</code>)
          </h2>
          <p className="mt-1 text-xs text-ink-secondary">
            Pilih satu atau banyak file <code className="font-mono">.md</code> ber-front-matter. Sistem melakukan pratinjau validasi terlebih dulu, menolak bila <code className="font-mono">track</code> atau <code className="font-mono">prerequisites</code> tidak ada, dan meng-upsert berdasarkan <code className="font-mono">slug</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            multiple
            onChange={handleFileSelect}
            className="sr-only"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-line-strong bg-canvas px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
          >
            <IconUpload className="h-4 w-4" />
            <span>Pilih File .md (Bisa Banyak)</span>
          </button>

          {selectedFiles.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
              <IconFileText className="h-4 w-4 text-brand-text" />
              <span>{selectedFiles.length} file dipilih</span>
            </span>
          ) : null}

          {previewItems && previewOk ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleImport}
              className="inline-flex min-h-[40px] items-center rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : `Simpan & Upsert ${selectedFiles.length} Pelajaran`}
            </button>
          ) : null}
        </div>

        {/* Tabel Pratinjau Hasil Validasi */}
        {previewItems && previewItems.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-line bg-canvas font-bold text-ink-secondary">
                <tr>
                  <th className="px-3 py-2.5">File</th>
                  <th className="px-3 py-2.5">Slug &amp; Judul</th>
                  <th className="px-3 py-2.5">Jalur / Urutan</th>
                  <th className="px-3 py-2.5">Status / Asal</th>
                  <th className="px-3 py-2.5">Hasil Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {previewItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2.5 font-mono text-ink-secondary">{item.fileName}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-ink">{item.title ?? "—"}</p>
                      <p className="font-mono text-ink-muted">{item.slug ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-ink-secondary">
                      {item.track ?? "—"} · #{item.order ?? "?"}
                    </td>
                    <td className="px-3 py-2.5 text-ink-secondary">
                      {item.status ?? "—"} · {item.origin ?? "—"} ({item.sourcesCount} sumber)
                    </td>
                    <td className="px-3 py-2.5">
                      {item.action === "invalid" ? (
                        <ul className="list-disc space-y-0.5 pl-4 text-rose-700 dark:text-rose-300">
                          {item.errors.map((e, eIdx) => (
                            <li key={eIdx}>{e}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {item.action === "create" ? "Siap dibuat baru" : "Siap diperbarui (upsert)"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {importedCount !== null ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
          >
            <IconCheckCircle className="h-4 w-4 shrink-0" />
            <span>Berhasil mengimpor / memperbarui {importedCount} pelajaran.</span>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-xs text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-100"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <IconAlertTriangle className="h-4 w-4 shrink-0" />
              <span>Validasi menolak unggahan:</span>
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* Panel Jalur Belajar (learning_tracks) */}
      <details className="rounded-xl border border-line-strong bg-surface p-5">
        <summary className="cursor-pointer text-sm font-bold text-ink">
          Kelola Jalur Belajar ({initialTracks.length} jalur terdaftar:{" "}
          {initialTracks.map((t) => t.slug).join(", ")})
        </summary>
        <form onSubmit={handleSaveTrack} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            type="text"
            value={trackSlug}
            onChange={(e) => setTrackSlug(e.target.value)}
            placeholder="slug (mis. mobile)"
            required
            className="min-h-[38px] rounded-lg border border-line-strong bg-canvas px-3 py-1.5 font-mono text-xs text-ink"
          />
          <input
            type="text"
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            placeholder="Judul jalur"
            required
            className="min-h-[38px] rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-xs text-ink"
          />
          <input
            type="text"
            value={trackDesc}
            onChange={(e) => setTrackDesc(e.target.value)}
            placeholder="Deskripsi singkat"
            className="min-h-[38px] rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-xs text-ink"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={trackOrder}
              onChange={(e) => setTrackOrder(e.target.value)}
              aria-label="Urutan jalur"
              className="min-h-[38px] w-20 rounded-lg border border-line-strong bg-canvas px-2.5 py-1.5 font-mono text-xs text-ink"
            />
            <button
              type="submit"
              disabled={savingTrack}
              className="min-h-[38px] rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-hover"
            >
              Simpan Jalur
            </button>
          </div>
        </form>
      </details>

      {/* Daftar Pelajaran + Toggle Draft/Reviewed + Hapus */}
      <section
        aria-label="Daftar Pelajaran"
        className="space-y-4 rounded-xl border border-line-strong bg-surface p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-ink">
              Daftar Pelajaran ({filteredLessons.length})
            </h2>
            <p className="text-xs text-ink-secondary">
              Hanya pelajaran berstatus <code className="font-mono">reviewed</code> yang tampil di halaman publik <code className="font-mono">/belajar</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterTrack}
              onChange={(e) => setFilterTrack(e.target.value)}
              aria-label="Filter jalur"
              className="min-h-[38px] rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-xs text-ink"
            >
              <option value="">Semua jalur</option>
              {initialTracks.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.title} ({t.slug})
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter status"
              className="min-h-[38px] rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-xs text-ink"
            >
              <option value="">Semua status</option>
              <option value="reviewed">reviewed</option>
              <option value="draft">draft</option>
            </select>
          </div>
        </div>

        {filteredLessons.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-xs text-ink-muted">
            Belum ada pelajaran yang cocok dengan filter ini.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-line bg-canvas font-bold text-ink-secondary">
                <tr>
                  <th className="px-3.5 py-2.5">Jalur / #</th>
                  <th className="px-3.5 py-2.5">Pelajaran</th>
                  <th className="px-3.5 py-2.5">Level / Asal</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredLessons.map((lesson) => {
                  const isBusy = busyLessonId === lesson.id;
                  return (
                    <tr key={lesson.id} className="hover:bg-canvas/60">
                      <td className="whitespace-nowrap px-3.5 py-3 font-mono text-ink-secondary tabular-nums">
                        {lesson.trackSlug} · #{lesson.sortOrder}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-ink">{lesson.title}</span>
                          {lesson.status === "reviewed" ? (
                            <Link
                              href={`/belajar/${lesson.trackSlug}/${lesson.slug}`}
                              target="_blank"
                              aria-label={`Buka ${lesson.title}`}
                              className="text-brand-text hover:opacity-80"
                            >
                              <IconExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          ) : null}
                        </div>
                        <p className="font-mono text-ink-muted">{lesson.slug}</p>
                        {lesson.prerequisites.length > 0 ? (
                          <p className="mt-0.5 text-ink-muted">
                            Prasyarat: {lesson.prerequisites.join(", ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 text-ink-secondary">
                        {LESSON_LEVEL_LABEL[lesson.level]} · {LESSON_ORIGIN_LABEL[lesson.origin]}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 font-bold ${
                            lesson.status === "reviewed"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {lesson.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleStatus(lesson.id, lesson.status)}
                            className="rounded-lg border border-line-strong bg-canvas px-2.5 py-1.5 font-semibold text-ink transition hover:bg-subtle disabled:opacity-50"
                          >
                            {lesson.status === "draft" ? "Set Reviewed" : "Set Draft"}
                          </button>

                          {confirmDeleteId === lesson.id ? (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="rounded-lg bg-red-600 px-2.5 py-1.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 font-semibold text-ink"
                              >
                                Batal
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteId(lesson.id)}
                              aria-label={`Hapus ${lesson.title}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
