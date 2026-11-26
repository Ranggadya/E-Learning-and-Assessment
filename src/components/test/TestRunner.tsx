"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionImage } from "./QuestionImage";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconClose,
  IconEyeOff,
  IconFlag,
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
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<number[]>([]);
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
  const flaggedCount = flaggedQuestionIds.length;
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

  const toggleFlagCurrent = useCallback(
    function toggleFlagCurrent() {
      if (!currentQuestion || isSubmitting) {
        return;
      }
      const questionId = currentQuestion.id;
      setFlaggedQuestionIds((previous) =>
        previous.includes(questionId)
          ? previous.filter((id) => id !== questionId)
          : [...previous, questionId],
      );
    },
    [currentQuestion, isSubmitting],
  );

  // Pintasan keyboard: 1-5 / A-E memilih jawaban, F menandai soal, panah kiri/kanan berpindah soal, Escape tutup dialog.
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

      const hasOptionKeyF = currentQuestion.options.some((opt) => opt.key.toUpperCase() === "F");
      if (pressed === "F" && !hasOptionKeyF) {
        event.preventDefault();
        toggleFlagCurrent();
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
  }, [
    currentIndex,
    currentQuestion,
    handleSelectOption,
    isModalOpen,
    isSubmitting,
    questions.length,
    toggleFlagCurrent,
  ]);

  if (!currentQuestion) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-ink">Subtes ini belum memiliki soal</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Kembali ke halaman paket untuk memilih subtes lain yang sudah tersedia.
        </p>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="mt-5 min-h-[40px] rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          Kembali ke Paket
        </button>
      </main>
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;
  const isCurrentAnswered = selectedByQuestionId[currentQuestion.id] !== undefined;
  const isCurrentFlagged = flaggedQuestionIds.includes(currentQuestion.id);
  const isTimeCritical = remainingSeconds <= 30;
  const isTimeWarning = remainingSeconds > 30 && remainingSeconds <= 60;
  const isMemoryVisible = !hiddenMemoryQuestionIds.includes(currentQuestion.id);
  const shouldShowImage =
    currentQuestion.imageSvg !== null && (currentQuestion.type !== "MEMORY" || isMemoryVisible);
  const answeredPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const memoryPercent = Math.round((memoryRemainingMs / MEMORY_DISPLAY_MS) * 100);
  const memorySecondsLeft = Math.ceil(memoryRemainingMs / 1000);
  const canUseFlagShortcut = !currentQuestion.options.some((opt) => opt.key.toUpperCase() === "F");

  const mobileTimerClassName = isTimeCritical
    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/70 dark:text-red-300"
    : isTimeWarning
      ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
      : "border-line bg-subtle text-ink";

  const sidebarTimerClassName = isTimeCritical
    ? "rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
    : isTimeWarning
      ? "rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
      : "px-0.5 py-1 text-ink";

  const navigatorGrid = (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-tight text-ink">Navigasi Soal</h2>
        <span className="text-xs font-medium tabular-nums text-ink-muted">
          {answeredCount}/{questions.length}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
        {questions.map((question, index) => {
          const isCurrent = index === currentIndex;
          const isAnswered = selectedByQuestionId[question.id] !== undefined;
          const isFlagged = flaggedQuestionIds.includes(question.id);
          return (
            <button
              key={question.id}
              type="button"
              aria-label={`Ke soal ${index + 1}${isAnswered ? " (sudah dijawab)" : ""}${isFlagged ? " (ditandai)" : ""}`}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => {
                setCurrentIndex(index);
                setMobileNavOpen(false);
              }}
              className={`relative flex h-9 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums transition ${
                isCurrent
                  ? "border-brand bg-brand text-white shadow-[0_2px_6px_-2px_rgba(37,99,235,0.45)]"
                  : isAnswered
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950"
                    : "border-line bg-surface text-ink-secondary hover:border-line-strong hover:bg-subtle hover:text-ink"
              }`}
            >
              {index + 1}
              {isFlagged ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-amber-500"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Compact Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-brand" />
          Aktif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs border border-emerald-400 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950" />
          Terjawab
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Ditandai
        </span>
      </div>

      {/* Timer Block — sesuai referensi kartu navigasi kiri */}
      <div className="mt-5 border-t border-line pt-4">
        <div
          role="timer"
          aria-live="off"
          aria-label={`Sisa waktu ${formatClock(remainingSeconds)}`}
          className={`flex items-center gap-3 ${sidebarTimerClassName}`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              isTimeCritical
                ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
                : isTimeWarning
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                  : "bg-subtle text-ink-secondary"
            }`}
          >
            <IconClock className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <span
              className={`block text-xs font-medium ${
                isTimeCritical || isTimeWarning ? "text-current opacity-85" : "text-ink-muted"
              }`}
            >
              Sisa waktu
            </span>
            <span className="block font-mono text-lg font-bold leading-tight tabular-nums">
              {formatClock(remainingSeconds)}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => {
          setMobileNavOpen(false);
          setShowSubmitConfirm(true);
        }}
        className={`mt-4 min-h-[42px] w-full rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          unansweredCount === 0
            ? "bg-brand text-white hover:bg-brand-hover"
            : "border border-line-strong bg-surface text-ink hover:bg-subtle"
        }`}
      >
        {isSubmitting ? "Mengirim..." : "Kumpulkan Jawaban"}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Minimal Sticky Focus Exam Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              aria-label="Keluar dari pengerjaan"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
              title="Keluar ke daftar subtes"
            >
              <IconArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-ink sm:text-base">
                {subtestName}
              </h1>
              <p className="truncate text-xs text-ink-muted">
                {companyName} · {packageName}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {/* Desktop compact answered counter (timer lives in sticky left card) */}
            <span className="hidden text-xs font-medium tabular-nums text-ink-secondary lg:inline-flex">
              Terjawab {answeredCount} dari {questions.length} soal
            </span>

            {/* Mobile/Tablet Timer & Submit */}
            <div
              role="timer"
              aria-live="off"
              aria-label={`Sisa waktu ${formatClock(remainingSeconds)}`}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2 py-1.5 font-mono text-xs font-bold tabular-nums sm:px-2.5 sm:text-sm lg:hidden ${mobileTimerClassName}`}
            >
              <IconClock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span>{formatClock(remainingSeconds)}</span>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowSubmitConfirm(true)}
              className="inline-flex min-h-[36px] items-center rounded-xl border border-line-strong bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-subtle disabled:opacity-60 sm:min-h-[38px] sm:px-3.5 sm:text-sm lg:hidden"
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

      {/* Main Two-Column Exam Workspace (Left Navigation Card + Right Dominant Question Card) */}
      <main className="flex w-full flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:gap-7 lg:px-8 lg:py-7">
        {/* Left Sticky Exam Navigation Card (Desktop) */}
        <aside className="sticky top-[84px] hidden w-[252px] shrink-0 rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none lg:block xl:w-[264px]">
          {navigatorGrid}
        </aside>

        {/* Right Area: Compact Attached Question Flag + Dominant Question Surface */}
        <div className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-start">
          {/* Desktop Attached Question Flag ("Bendera" Info No Soal — compact, nempel di sisi kiri atas area soal) */}
          <aside
            aria-label={`Informasi soal nomor ${currentIndex + 1}`}
            className="hidden w-[128px] shrink-0 self-start flex-col items-center rounded-l-2xl border-y border-l border-[#1B365D] bg-[#1B365D] px-3.5 py-5 text-center text-white shadow-[-4px_6px_14px_-6px_rgba(15,23,42,0.22)] dark:border-blue-900/70 dark:bg-[#15294A] dark:shadow-none lg:flex xl:w-[138px]"
          >
            <span className="text-xs font-semibold text-blue-200">Soal</span>
            <span className="mt-1 text-3xl font-extrabold leading-none tabular-nums text-white">
              {currentIndex + 1}
            </span>

            <span
              className={`mt-2.5 inline-flex items-center justify-center gap-1 text-xs font-medium leading-tight ${
                isCurrentAnswered ? "text-emerald-200" : "text-blue-100/90"
              }`}
            >
              {isCurrentAnswered ? (
                <>
                  <IconCheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Terjawab</span>
                </>
              ) : (
                <span>Belum dijawab</span>
              )}
            </span>

            <div className="my-3.5 h-px w-full bg-white/15" />

            <button
              type="button"
              onClick={toggleFlagCurrent}
              aria-pressed={isCurrentFlagged}
              className={`inline-flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isCurrentFlagged
                  ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/50 hover:bg-amber-400/30"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <IconFlag
                className={`h-3.5 w-3.5 shrink-0 ${
                  isCurrentFlagged ? "fill-amber-300 text-amber-300" : ""
                }`}
              />
              <span>{isCurrentFlagged ? "Ditandai" : "Tandai"}</span>
            </button>
          </aside>

          {/* Main Question Surface — Dominan & Ukuran Tetap Stabil */}
          <section className="relative z-[1] flex min-h-[540px] min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none lg:-ml-px lg:min-h-[calc(100vh-132px)] lg:rounded-tl-none">
            {/* Mobile/Tablet Compact Attached Top Flag Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1B365D] px-4 py-3 text-white dark:bg-[#15294A] lg:hidden">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-extrabold tabular-nums text-white">
                  Soal {currentIndex + 1}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                    isCurrentAnswered
                      ? "bg-emerald-400/20 text-emerald-200"
                      : "bg-white/10 text-blue-100"
                  }`}
                >
                  {isCurrentAnswered ? "Terjawab" : "Belum dijawab"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFlagCurrent}
                  aria-pressed={isCurrentFlagged}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    isCurrentFlagged
                      ? "bg-amber-400/25 text-amber-200 ring-1 ring-amber-300/50"
                      : "bg-white/10 text-blue-100 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  <IconFlag
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isCurrentFlagged ? "fill-amber-300 text-amber-300" : ""
                    }`}
                  />
                  <span>{isCurrentFlagged ? "Ditandai" : "Tandai"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMobileNavOpen((prev) => !prev)}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <IconGrid className="h-3.5 w-3.5" />
                  <span className="tabular-nums">
                    {answeredCount}/{questions.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Mobile Inline Collapsible Navigator */}
            {mobileNavOpen ? (
              <div className="animate-step border-b border-line bg-canvas p-4 lg:hidden">
                {navigatorGrid}
              </div>
            ) : null}

            {/* Question Content Body */}
            <div key={currentQuestion.id} className="animate-step flex-1 p-5 sm:p-8">
              {currentQuestion.type !== "TEXT" ? (
                <div className="mb-3 flex items-center gap-2">
                  <QuestionTypeBadge type={currentQuestion.type} />
                </div>
              ) : null}

              <p className="w-full break-words whitespace-pre-line text-base font-bold leading-relaxed text-ink sm:text-lg">
                {currentQuestion.prompt}
              </p>

              {/* MEMORY Visual 5-second Countdown Banner */}
              {currentQuestion.type === "MEMORY" && isMemoryVisible ? (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800/80 dark:bg-amber-950/50">
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
                <div className="my-5 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200">
                  <IconEyeOff className="h-4 w-4 shrink-0" />
                  <span>Gambar sudah disembunyikan setelah 5 detik. Jawab berdasarkan ingatanmu.</span>
                </div>
              ) : null}

              {currentQuestion.type === "SPEED" ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-900/80 dark:bg-rose-950/50 dark:text-rose-200">
                  <IconZap className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Mode kecepatan: setelah memilih jawaban, sistem langsung berpindah ke soal berikutnya.
                  </span>
                </div>
              ) : null}

              {/* Options Subtitle + Divider-Separated Radio Rows */}
              <p className="mt-4 text-sm text-ink-secondary">Pilih satu jawaban:</p>

              <ul
                className="mt-2.5 divide-y divide-line border-y border-line"
                role="radiogroup"
                aria-label={`Pilihan jawaban soal ${currentIndex + 1}`}
              >
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedByQuestionId[currentQuestion.id] === option.key;
                  return (
                    <li key={option.key}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isSubmitting}
                        onClick={() => handleSelectOption(option.key)}
                        className={`group flex min-h-[52px] w-full items-start gap-3.5 px-3 py-3.5 text-left transition sm:px-4 ${
                          isSelected
                            ? "bg-brand-soft text-ink"
                            : "bg-surface text-ink hover:bg-subtle/60"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                            isSelected
                              ? "border-brand bg-brand"
                              : "border-line-strong bg-surface group-hover:border-brand/60"
                          }`}
                        >
                          {isSelected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                        </span>
                        <span
                          className={`shrink-0 text-sm font-bold sm:text-[15px] ${
                            isSelected ? "text-brand-text" : "text-ink"
                          }`}
                        >
                          {option.key}.
                        </span>
                        <span className="flex-1 text-sm leading-relaxed text-ink sm:text-[15px]">
                          {option.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 hidden items-center gap-2 text-xs text-ink-muted md:flex">
                <IconKeyboard className="h-3.5 w-3.5 shrink-0" />
                <span className="flex flex-wrap items-center gap-1.5">
                  <span>Pintasan:</span>
                  <kbd className="rounded-md border border-line-strong bg-subtle px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                    1–{currentQuestion.options.length}
                  </kbd>
                  <span>/</span>
                  <kbd className="rounded-md border border-line-strong bg-subtle px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                    A–{String.fromCharCode(64 + currentQuestion.options.length)}
                  </kbd>
                  <span>pilih,</span>
                  {canUseFlagShortcut ? (
                    <>
                      <kbd className="rounded-md border border-line-strong bg-subtle px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                        F
                      </kbd>
                      <span>tandai,</span>
                    </>
                  ) : null}
                  <kbd className="rounded-md border border-line-strong bg-subtle px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                    ←
                  </kbd>
                  <kbd className="rounded-md border border-line-strong bg-subtle px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                    →
                  </kbd>
                  <span>pindah soal.</span>
                </span>
              </p>

              {errorMessage ? (
                <div
                  role="alert"
                  className="mt-5 flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
                >
                  <IconAlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}
            </div>

            {/* Bottom Prev / Counter / Next Footer Bar */}
            <nav
              aria-label="Navigasi antar soal"
              className="flex items-center justify-between gap-2 border-t border-line bg-surface px-4 py-4 sm:gap-3 sm:px-7"
            >
              <button
                type="button"
                disabled={currentIndex === 0 || isSubmitting}
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="inline-flex min-h-[42px] shrink-0 items-center gap-1 rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:bg-subtle disabled:cursor-not-allowed disabled:border-line disabled:bg-subtle/70 disabled:text-ink-muted sm:gap-1.5 sm:px-4"
              >
                <IconChevronLeft className="h-4 w-4" />
                <span>Sebelumnya</span>
              </button>

              <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-ink-secondary sm:text-sm">
                {currentIndex + 1} dari {questions.length}
              </span>

              {isLastQuestion ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowSubmitConfirm(true)}
                  className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60 sm:px-5"
                >
                  <span>{isSubmitting ? "Mengirim..." : "Selesai"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="inline-flex min-h-[42px] shrink-0 items-center gap-1 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60 sm:gap-1.5 sm:px-5"
                >
                  <span>Berikutnya</span>
                  <IconChevronRight className="h-4 w-4" />
                </button>
              )}
            </nav>
          </section>
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-dialog-title"
        >
          <div className="animate-dialog w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 id="submit-dialog-title" className="text-lg font-bold text-ink">
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
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200">
                <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Masih ada <strong className="tabular-nums">{unansweredCount} soal</strong> yang belum dijawab. Soal kosong bernilai 0 tanpa pengurangan.
                </span>
              </div>
            ) : null}

            {flaggedCount > 0 ? (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-brand-soft p-3 text-sm text-brand-text dark:border-blue-900/70">
                <IconFlag className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Kamu masih menandai <strong className="tabular-nums">{flaggedCount} soal</strong> untuk ditinjau ulang.
                </span>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="min-h-[40px] rounded-xl border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                Kembali Mengerjakan
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={submitAttempt}
                className="min-h-[40px] rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
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
          <div className="animate-dialog w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
            <h2 id="exit-dialog-title" className="text-lg font-bold text-ink">
              Keluar dari subtes?
            </h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Jawaban yang sudah kamu pilih pada sesi ini belum dikirim dan tidak akan tersimpan jika kamu keluar sekarang.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="min-h-[40px] rounded-xl border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                Lanjut Mengerjakan
              </button>
              <button
                type="button"
                onClick={() => {
                  hasSubmittedRef.current = true;
                  router.push(backHref);
                }}
                className="min-h-[40px] rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
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
