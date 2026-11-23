"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionImage } from "./QuestionImage";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconClose,
  IconEyeOff,
  IconGrid,
  IconKeyboard,
  IconZap,
} from "@/components/ui/Icons";
import { QuestionTypeBadge } from "@/components/ui/QuestionTypeBadge";
import { useCountdown } from "@/hooks/useCountdown";
import type { PublicQuestion, SubmitAttemptInput } from "@/types/assessment";

interface TestRunnerProps {
  subtestId: number;
  subtestName: string;
  companyName: string;
  packageName: string;
  backHref: string;
  durationSeconds: number;
  questions: PublicQuestion[];
}

const MEMORY_DISPLAY_MS = 5000;

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function TestRunner({
  subtestId,
  subtestName,
  companyName,
  packageName,
  backHref,
  durationSeconds,
  questions,
}: TestRunnerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedByQuestionId, setSelectedByQuestionId] = useState<Record<number, string>>({});
  const [hiddenMemoryQuestionIds, setHiddenMemoryQuestionIds] = useState<number[]>([]);
  const [memoryRemainingMs, setMemoryRemainingMs] = useState<number>(MEMORY_DISPLAY_MS);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const hasSubmittedRef = useRef<boolean>(false);
  const selectedRef = useRef<Record<number, string>>({});
  const memoryStartByQuestionIdRef = useRef<Record<number, number>>({});

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(selectedByQuestionId).length;
  const unansweredCount = questions.length - answeredCount;
  const isModalOpen = showSubmitConfirm || showExitConfirm;

  const submitAttempt = useCallback(
    async function submitAttempt() {
      if (hasSubmittedRef.current) {
        return;
      }
      hasSubmittedRef.current = true;
      setShowSubmitConfirm(false);
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload: SubmitAttemptInput = {
        subtestId,
        answers: questions.map(function toAnswer(question) {
          return {
            questionId: question.id,
            selectedOption: selectedRef.current[question.id] ?? null,
          };
        }),
      };

      try {
        const response = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Gagal menyimpan jawaban");
        }
        const data = (await response.json()) as { attemptId: number };
        router.push(`/result/${data.attemptId}`);
      } catch {
        hasSubmittedRef.current = false;
        setIsSubmitting(false);
        setErrorMessage("Jawaban belum tersimpan karena gangguan koneksi. Coba kirim ulang.");
      }
    },
    [questions, router, subtestId],
  );

  const remainingSeconds = useCountdown(durationSeconds, submitAttempt);

  // Lindungi peserta dari menutup/refresh tab secara tidak sengaja saat sesi berjalan.
  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (hasSubmittedRef.current) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Soal MEMORY: gambar tampil maksimal 5 detik sejak pertama dibuka, dengan bar hitung mundur visual.
  useEffect(() => {
    if (currentQuestion?.type !== "MEMORY") {
      return;
    }
    const questionId = currentQuestion.id;
    if (hiddenMemoryQuestionIds.includes(questionId)) {
      return;
    }

    const now = Date.now();
    if (memoryStartByQuestionIdRef.current[questionId] === undefined) {
      memoryStartByQuestionIdRef.current[questionId] = now;
    }
    const startedAt = memoryStartByQuestionIdRef.current[questionId];

    function updateMemoryCountdown() {
      const left = Math.max(0, MEMORY_DISPLAY_MS - (Date.now() - startedAt));
      setMemoryRemainingMs(left);
      if (left <= 0) {
        setHiddenMemoryQuestionIds((previous) =>
          previous.includes(questionId) ? previous : [...previous, questionId],
        );
      }
    }

    updateMemoryCountdown();
    const intervalId = window.setInterval(updateMemoryCountdown, 80);
    return () => window.clearInterval(intervalId);
  }, [currentQuestion, hiddenMemoryQuestionIds]);

  const handleSelectOption = useCallback(
    function handleSelectOption(optionKey: string) {
      if (!currentQuestion || isSubmitting) {
        return;
      }
      selectedRef.current = { ...selectedRef.current, [currentQuestion.id]: optionKey };
      setSelectedByQuestionId(selectedRef.current);
      if (currentQuestion.type === "SPEED" && currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    },
    [currentIndex, currentQuestion, isSubmitting, questions.length],
  );

  // Pintasan keyboard: 1-5 / A-E untuk memilih jawaban, panah kiri/kanan untuk navigasi, Escape tutup dialog.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowSubmitConfirm(false);
        setShowExitConfirm(false);
        setMobileNavOpen(false);
        return;
      }
      if (!currentQuestion || isSubmitting || isModalOpen || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (event.key === "ArrowLeft" && currentIndex > 0) {
        event.preventDefault();
        setCurrentIndex(currentIndex - 1);
        return;
      }
      if (event.key === "ArrowRight" && currentIndex < questions.length - 1) {
        event.preventDefault();
        setCurrentIndex(currentIndex + 1);
        return;
      }

      const pressed = event.key.toUpperCase();
      if (pressed.length !== 1) {
        return;
      }
      const numericIndex = Number(pressed) - 1;
      const optionIndex =
        Number.isInteger(numericIndex) && numericIndex >= 0 ? numericIndex : pressed.charCodeAt(0) - 65;
      const option = currentQuestion.options[optionIndex];
      if (option) {
        handleSelectOption(option.key);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentQuestion, handleSelectOption, isModalOpen, isSubmitting, questions.length]);

  if (!currentQuestion) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-ink">Subtes ini belum memiliki soal</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Kembali ke halaman paket untuk memilih subtes lain yang sudah tersedia.
        </p>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Kembali ke Paket
        </button>
      </main>
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;
  const isTimeCritical = remainingSeconds <= 30;
  const isTimeWarning = remainingSeconds > 30 && remainingSeconds <= 60;
  const isMemoryVisible = !hiddenMemoryQuestionIds.includes(currentQuestion.id);
  const shouldShowImage =
    currentQuestion.imageSvg !== null && (currentQuestion.type !== "MEMORY" || isMemoryVisible);
  const answeredPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const memoryPercent = Math.round((memoryRemainingMs / MEMORY_DISPLAY_MS) * 100);
  const memorySecondsLeft = Math.ceil(memoryRemainingMs / 1000);

  const timerClassName = isTimeCritical
    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/70 dark:text-red-300"
    : isTimeWarning
      ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
      : "border-line bg-subtle text-ink";

  const navigatorGrid = (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">Daftar Nomor Soal</span>
        <span className="font-mono tabular-nums text-ink-muted">
          {answeredCount}/{questions.length} terjawab
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-5">
        {questions.map((question, index) => {
          const isCurrent = index === currentIndex;
          const isAnswered = selectedByQuestionId[question.id] !== undefined;
          return (
            <button
              key={question.id}
              type="button"
              aria-label={`Ke soal ${index + 1}${isAnswered ? " (sudah dijawab)" : ""}`}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => {
                setCurrentIndex(index);
                setMobileNavOpen(false);
              }}
              className={`h-9 rounded-lg border text-xs font-semibold tabular-nums transition ${
                isCurrent
                  ? "border-brand bg-brand text-white"
                  : isAnswered
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950"
                    : "border-line bg-surface text-ink-secondary hover:bg-subtle hover:text-ink"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-brand" />
          Aktif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs border border-emerald-400 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950" />
          Terjawab
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs border border-line bg-surface" />
          Belum
        </span>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => {
          setMobileNavOpen(false);
          setShowSubmitConfirm(true);
        }}
        className={
          unansweredCount === 0
            ? "w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
            : "w-full rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-subtle disabled:opacity-60"
        }
      >
        {isSubmitting ? "Mengirim..." : "Kumpulkan Jawaban"}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Sticky Focus Exam Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              aria-label="Keluar dari pengerjaan"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
              title="Keluar ke daftar subtes"
            >
              <IconArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-ink sm:text-base">{subtestName}</h1>
              <p className="truncate text-xs text-ink-muted">
                {companyName} · {packageName}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div
              role="timer"
              aria-live="off"
              aria-label={`Sisa waktu ${formatClock(remainingSeconds)}`}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-sm font-bold tabular-nums sm:px-3 sm:text-lg ${timerClassName}`}
            >
              <IconClock className="h-4 w-4 shrink-0" />
              <span>{formatClock(remainingSeconds)}</span>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowSubmitConfirm(true)}
              className="inline-flex rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-subtle disabled:opacity-60 sm:px-3.5 sm:py-2 sm:text-sm lg:hidden"
            >
              {isSubmitting ? "Mengirim..." : "Selesai"}
            </button>

            <ThemeToggle compact />
          </div>
        </div>

        {/* Answered Progress Hairline Bar */}
        <div className="h-1 w-full bg-subtle">
          <div
            className="h-full bg-brand transition-all duration-200"
            style={{ width: `${answeredPercent}%` }}
          />
        </div>
      </header>

      {/* Main Two-Column Exam Workspace */}
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:py-8">
        {/* Question Surface */}
        <section className="rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold tabular-nums text-ink">
                Soal {currentIndex + 1} dari {questions.length}
              </span>
              {currentQuestion.type !== "TEXT" ? (
                <QuestionTypeBadge type={currentQuestion.type} />
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-subtle px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition hover:text-ink lg:hidden"
            >
              <IconGrid className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                Terjawab {answeredCount}/{questions.length}
              </span>
            </button>
          </div>

          {/* Mobile inline collapsible grid */}
          {mobileNavOpen ? (
            <div className="animate-step mt-4 rounded-xl border border-line bg-canvas p-4 lg:hidden">
              {navigatorGrid}
            </div>
          ) : null}

          <div key={currentQuestion.id} className="animate-step mt-5">
            <p className="max-w-[70ch] whitespace-pre-line text-base leading-relaxed text-ink sm:text-[17px]">
              {currentQuestion.prompt}
            </p>

            {/* MEMORY Visual 5-second Countdown Banner */}
            {currentQuestion.type === "MEMORY" && isMemoryVisible ? (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800/80 dark:bg-amber-950/50">
                <div className="flex items-center justify-between text-xs font-medium text-amber-900 dark:text-amber-200">
                  <span>Perhatikan gambar — akan disembunyikan dalam {memorySecondsLeft} detik</span>
                  <span className="font-mono tabular-nums">{memorySecondsLeft} dtk</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/70">
                  <div
                    className="h-full rounded-full bg-amber-600 transition-[width] duration-75 dark:bg-amber-400"
                    style={{ width: `${memoryPercent}%` }}
                  />
                </div>
              </div>
            ) : null}

            {shouldShowImage && currentQuestion.imageSvg !== null ? (
              <QuestionImage svgMarkup={currentQuestion.imageSvg} />
            ) : null}

            {currentQuestion.type === "MEMORY" && !isMemoryVisible ? (
              <div className="my-5 flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200">
                <IconEyeOff className="h-4 w-4 shrink-0" />
                <span>Gambar sudah disembunyikan setelah 5 detik. Jawab berdasarkan ingatanmu.</span>
              </div>
            ) : null}

            {currentQuestion.type === "SPEED" ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800 dark:border-rose-900/80 dark:bg-rose-950/50 dark:text-rose-200">
                <IconZap className="h-3.5 w-3.5 shrink-0" />
                <span>Mode kecepatan: setelah memilih jawaban, sistem langsung berpindah ke soal berikutnya.</span>
              </div>
            ) : null}

            {/* Options */}
            <ul className="mt-6 space-y-2.5" role="radiogroup" aria-label={`Pilihan jawaban soal ${currentIndex + 1}`}>
              {currentQuestion.options.map((option) => {
                const isSelected = selectedByQuestionId[currentQuestion.id] === option.key;
                return (
                  <li key={option.key}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelectOption(option.key)}
                      aria-pressed={isSelected}
                      className={`group flex w-full items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left transition ${
                        isSelected
                          ? "border-brand bg-brand-soft text-ink shadow-[0_0_0_1px_var(--accent)]"
                          : "border-line bg-surface text-ink hover:border-line-strong hover:bg-subtle/60"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold transition ${
                          isSelected
                            ? "border-brand bg-brand text-white"
                            : "border-line-strong bg-subtle text-ink-secondary group-hover:border-ink-muted"
                        }`}
                      >
                        {option.key}
                      </span>
                      <span className="flex-1 text-sm leading-relaxed sm:text-[15px]">{option.label}</span>
                      {isSelected ? (
                        <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-text" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 hidden items-center gap-2 text-xs text-ink-muted md:flex">
              <IconKeyboard className="h-3.5 w-3.5 shrink-0" />
              <span className="flex flex-wrap items-center gap-1.5">
                <span>Pintasan:</span>
                <kbd className="rounded border border-line-strong bg-subtle px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink">
                  1–{currentQuestion.options.length}
                </kbd>
                <span>atau</span>
                <kbd className="rounded border border-line-strong bg-subtle px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink">
                  A–{String.fromCharCode(64 + currentQuestion.options.length)}
                </kbd>
                <span>untuk memilih,</span>
                <kbd className="rounded border border-line-strong bg-subtle px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink">
                  ←
                </kbd>
                <kbd className="rounded border border-line-strong bg-subtle px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink">
                  →
                </kbd>
                <span>untuk berpindah soal.</span>
              </span>
            </p>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-5 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
            >
              <IconAlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {/* Bottom Prev / Next Bar */}
          <nav
            aria-label="Navigasi antar soal"
            className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5"
          >
            <button
              type="button"
              disabled={currentIndex === 0 || isSubmitting}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconArrowLeft className="h-4 w-4" />
              <span>Sebelumnya</span>
            </button>

            {isLastQuestion ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
              >
                <span>{isSubmitting ? "Mengirim..." : "Selesai & Kumpulkan"}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
              >
                <span>Berikutnya</span>
                <IconArrowRight className="h-4 w-4" />
              </button>
            )}
          </nav>
        </section>

        {/* Desktop Question Navigator Panel */}
        <aside className="sticky top-[84px] hidden rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:block">
          {navigatorGrid}
        </aside>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-dialog-title"
        >
          <div className="animate-dialog w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 id="submit-dialog-title" className="text-lg font-semibold text-ink">
                Kumpulkan jawaban sekarang?
              </h2>
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                aria-label="Tutup dialog"
                className="rounded-lg p-1 text-ink-muted hover:bg-subtle hover:text-ink"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-sm text-ink-secondary">
              Kamu telah menjawab{" "}
              <strong className="font-mono tabular-nums text-ink">
                {answeredCount} dari {questions.length}
              </strong>{" "}
              soal. Setelah dikumpulkan, skor dan pembahasan akan langsung ditampilkan.
            </p>

            {unansweredCount > 0 ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200">
                <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Masih ada <strong className="tabular-nums">{unansweredCount} soal</strong> yang belum dijawab. Soal kosong bernilai 0 tanpa pengurangan.
                </span>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                Kembali Mengerjakan
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={submitAttempt}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
              >
                {isSubmitting ? "Mengirim..." : "Ya, Kumpulkan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Exit Confirmation Modal */}
      {showExitConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
        >
          <div className="animate-dialog w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl">
            <h2 id="exit-dialog-title" className="text-lg font-semibold text-ink">
              Keluar dari subtes?
            </h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Jawaban yang sudah kamu pilih pada sesi ini belum dikirim dan tidak akan tersimpan jika kamu keluar sekarang.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                Lanjut Mengerjakan
              </button>
              <button
                type="button"
                onClick={() => {
                  hasSubmittedRef.current = true;
                  router.push(backHref);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
