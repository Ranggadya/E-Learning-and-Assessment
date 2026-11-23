"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconCheckCircle,
  IconKeyboard,
  IconRotateCcw,
  IconXCircle,
} from "@/components/ui/Icons";
import { LevelBadge } from "@/components/ui/QuestionTypeBadge";
import { useAnonUserId } from "@/lib/client/anon-user";
import { CEFR_LEVELS, LEITNER_BOX_DAYS } from "@/lib/english/constants";
import type { CefrLevel, EnglishWordWithProgress } from "@/types/english";

const NEW_LIMIT_KEY = "e-assessment:english-new-limit:v1";

interface FlashcardStudyClientProps {
  initialCefr: CefrLevel | "";
}

function readInitialNewLimit(): number {
  if (typeof window === "undefined") return 10;
  try {
    const saved = Number(window.localStorage.getItem(NEW_LIMIT_KEY));
    if (Number.isInteger(saved) && saved >= 5 && saved <= 50) {
      return saved;
    }
  } catch {
    // Gunakan default
  }
  return 10;
}

export function FlashcardStudyClient({ initialCefr }: FlashcardStudyClientProps) {
  const userId = useAnonUserId();
  const [cefr, setCefr] = useState<CefrLevel | "">(initialCefr);
  const [newLimit, setNewLimit] = useState<number>(readInitialNewLimit);
  const [reloadTick, setReloadTick] = useState(0);
  const [queue, setQueue] = useState<EnglishWordWithProgress[]>([]);
  const [dueTotal, setDueTotal] = useState(0);
  const [newTotal, setNewTotal] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionStats, setSessionStats] = useState<{ known: number; unknown: number }>({
    known: 0,
    unknown: 0,
  });

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const sp = new URLSearchParams({
      userId,
      newLimit: String(newLimit),
    });
    if (cefr) sp.set("cefr", cefr);

    fetch(`/api/materi/study?${sp.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(
        (data: {
          dueWords?: EnglishWordWithProgress[];
          newWords?: EnglishWordWithProgress[];
        }) => {
          if (controller.signal.aborted) return;
          const dueList = data.dueWords ?? [];
          const newList = data.newWords ?? [];
          setDueTotal(dueList.length);
          setNewTotal(newList.length);
          setQueue([...dueList, ...newList]);
          setCurrentIndex(0);
          setFlipped(false);
          setSessionStats({ known: 0, unknown: 0 });
        },
      )
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [userId, cefr, newLimit, reloadTick]);

  const currentCard = queue[currentIndex];
  const isFinished = !loading && queue.length > 0 && currentIndex >= queue.length;

  const handleAnswer = useCallback(
    async (known: boolean) => {
      if (!userId || !currentCard || submitting) return;
      setSubmitting(true);
      try {
        await fetch("/api/materi/study", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            wordId: currentCard.id,
            known,
          }),
        });
        setSessionStats((prev) => ({
          known: prev.known + (known ? 1 : 0),
          unknown: prev.unknown + (known ? 0 : 1),
        }));
        setFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } finally {
        setSubmitting(false);
      }
    },
    [userId, currentCard, submitting],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!currentCard || loading || submitting) return;

      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && e.key === "1") {
        e.preventDefault();
        void handleAnswer(true);
      } else if (flipped && e.key === "2") {
        e.preventDefault();
        void handleAnswer(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentCard, flipped, loading, submitting, handleAnswer]);

  function handleSelectCefr(next: CefrLevel | "") {
    setLoading(true);
    setCefr(next);
  }

  function handleChangeNewLimit(val: number) {
    setLoading(true);
    setNewLimit(val);
    try {
      window.localStorage.setItem(NEW_LIMIT_KEY, String(val));
    } catch {
      // Abaikan
    }
  }

  function handleReloadNextSession() {
    setLoading(true);
    setReloadTick((t) => t + 1);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/materi/kamus"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-ink-secondary transition hover:text-ink"
        >
          <IconArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Kamus</span>
        </Link>
        <Link
          href="/materi"
          className="inline-flex min-h-[40px] items-center text-xs font-semibold text-brand-text hover:underline"
        >
          Lihat Ringkasan Kotak
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Mode Kartu (Flashcard Leitner)
        </h1>
        <p className="mt-1 text-xs text-ink-secondary">
          Jeda ulang otomatis: Kotak 1 (1 hr) → Kotak 2 (2 hr) → Kotak 3 (4 hr) → Kotak 4 (8 hr) → Kotak 5 (16 hr).
        </p>
      </div>

      {/* Pengaturan Level & Batas Kata Baru */}
      <section
        aria-label="Pengaturan sesi belajar"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-strong bg-surface p-3.5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold text-ink-muted">Level:</span>
          <button
            type="button"
            aria-pressed={cefr === ""}
            onClick={() => handleSelectCefr("")}
            className={`min-h-[40px] rounded-lg border px-3 py-2 text-xs font-bold transition ${
              cefr === ""
                ? "border-brand bg-brand text-white"
                : "border-line-strong bg-canvas text-ink-secondary hover:bg-subtle"
            }`}
          >
            Semua
          </button>
          {CEFR_LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              aria-pressed={cefr === lvl}
              onClick={() => handleSelectCefr(lvl)}
              className={`min-h-[40px] rounded-lg border px-3 py-2 text-xs font-bold transition ${
                cefr === lvl
                  ? "border-brand bg-brand text-white"
                  : "border-line-strong bg-canvas text-ink-secondary hover:bg-subtle"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="new-limit-select" className="font-semibold text-ink-secondary">
            Kata baru/sesi:
          </label>
          <select
            id="new-limit-select"
            value={newLimit}
            onChange={(e) => handleChangeNewLimit(Number(e.target.value))}
            className="min-h-[40px] rounded-lg border border-line-strong bg-canvas px-2.5 py-2 font-bold text-ink"
          >
            {[5, 10, 15, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n} kata
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Isi Sesi */}
      {loading ? (
        <div className="rounded-xl border border-line-strong bg-surface p-10 text-center text-sm text-ink-secondary">
          Menyiapkan antrean kartu...
        </div>
      ) : queue.length === 0 ? (
        <div className="rounded-xl border border-line-strong bg-surface p-8 text-center">
          <IconCheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-3 text-base font-bold text-ink">
            Tidak ada kartu jatuh tempo atau kata baru pada filter ini
          </h2>
          <p className="mt-1 text-xs text-ink-secondary">
            Semua kata pada level ini sudah dipelajari dan belum jatuh tempo untuk diulang.
          </p>
        </div>
      ) : isFinished ? (
        <div className="space-y-4 rounded-xl border border-line-strong bg-surface p-6 text-center">
          <IconCheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="text-lg font-extrabold text-ink">Sesi Belajar Selesai!</h2>
          <p className="text-sm text-ink-secondary">
            Kamu telah menyelesaikan <strong>{queue.length}</strong> kartu ({dueTotal} jatuh tempo + {newTotal} kata baru).
          </p>

          <div className="mx-auto grid max-w-xs grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/60">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Tahu (Naik Kotak)
              </span>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200">
                {sessionStats.known}
              </p>
            </div>
            <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/60">
              <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                Belum (Kotak 1)
              </span>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-rose-900 dark:text-rose-200">
                {sessionStats.unknown}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5 pt-3">
            <button
              type="button"
              onClick={handleReloadNextSession}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
            >
              <IconRotateCcw className="h-3.5 w-3.5" />
              <span>Ambil Sesi Berikutnya</span>
            </button>
            <Link
              href="/materi"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-line-strong bg-canvas px-4 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
            >
              <span>Kembali ke Ringkasan Materi</span>
            </Link>
          </div>
        </div>
      ) : currentCard ? (
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
            <span>
              Kartu <strong className="tabular-nums text-ink">{currentIndex + 1}</strong> dari{" "}
              <strong className="tabular-nums text-ink">{queue.length}</strong> ({dueTotal} jatuh tempo · {newTotal} baru)
            </span>
            <span className="font-mono tabular-nums">
              Tahu: <strong className="text-emerald-700 dark:text-emerald-400">{sessionStats.known}</strong> · Belum:{" "}
              <strong className="text-rose-700 dark:text-rose-400">{sessionStats.unknown}</strong>
            </span>
          </div>

          {/* Kartu Utama */}
          <div className="flex min-h-[300px] flex-col justify-between rounded-xl border border-line-strong bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink-muted">
                  #{currentCard.no}
                </span>
                <span className="rounded bg-subtle px-2 py-0.5 font-mono text-xs font-semibold text-ink-secondary">
                  {currentCard.pos}
                </span>
                {currentCard.box ? (
                  <span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-text">
                    Kotak {currentCard.box} ({LEITNER_BOX_DAYS[currentCard.box]} hr)
                  </span>
                ) : (
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Kata Baru
                  </span>
                )}
              </div>
              <LevelBadge level={currentCard.cefr} />
            </div>

            {/* Kata Depan */}
            <div className="my-6 text-center">
              <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                {currentCard.word}
              </p>

              <div aria-live="polite">
                {flipped ? (
                  <div className="mt-6 space-y-3 border-t border-line pt-5 text-left">
                    <div>
                      <span className="text-xs font-semibold text-ink-muted">
                        Arti Bahasa Indonesia
                      </span>
                      <p className="mt-0.5 text-lg font-extrabold text-brand-text">
                        {currentCard.meaning_id}
                      </p>
                    </div>
                    <div className="rounded-lg bg-canvas p-3 text-xs leading-relaxed">
                      <p className="font-semibold text-ink">&ldquo;{currentCard.example_en}&rdquo;</p>
                      <p className="mt-1 text-ink-secondary">{currentCard.example_id}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-ink-muted">
                    Ingat artinya dalam hati, lalu klik <strong>Balik Kartu</strong> atau tekan <kbd className="rounded border border-line-strong bg-subtle px-1.5 py-0.5 font-mono">Spasi</kbd>
                  </p>
                )}
              </div>
            </div>

            {/* Tombol Aksi */}
            <div>
              {!flipped ? (
                <button
                  type="button"
                  onClick={() => setFlipped(true)}
                  className="min-h-[44px] w-full rounded-lg bg-brand py-3 text-sm font-bold text-white shadow-xs transition hover:bg-brand-hover"
                >
                  Balik Kartu (Spasi)
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAnswer(false)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 py-3 text-sm font-bold text-rose-900 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-200"
                  >
                    <IconXCircle className="h-4 w-4" />
                    <span>Belum (2) · Kotak 1</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAnswer(true)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-50"
                  >
                    <IconCheckCircle className="h-4 w-4" />
                    <span>
                      Tahu (1) · Kotak {Math.min(5, (currentCard.box ?? 1) + 1)}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-ink-muted">
            <IconKeyboard className="h-3.5 w-3.5" />
            <span>Pintasan: Spasi = Balik kartu · 1 = Tahu · 2 = Belum</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
