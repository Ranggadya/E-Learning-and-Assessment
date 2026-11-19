"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCountdown } from "@/hooks/useCountdown";
import { QuestionImage } from "./QuestionImage";
import type { PublicQuestion, SubmitAttemptInput } from "@/lib/types";

interface TestRunnerProps {
  subtestId: number;
  subtestName: string;
  durationSeconds: number;
  questions: PublicQuestion[];
}

const MEMORY_DISPLAY_SECONDS = 5;

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function TestRunner({ subtestId, subtestName, durationSeconds, questions }: TestRunnerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedByQuestionId, setSelectedByQuestionId] = useState<Record<number, string>>({});
  const [hiddenMemoryQuestionIds, setHiddenMemoryQuestionIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasSubmittedRef = useRef<boolean>(false);
  const selectedRef = useRef<Record<number, string>>({});

  const currentQuestion = questions[currentIndex];

  const submitAttempt = useCallback(
    async function submitAttempt() {
      if (hasSubmittedRef.current) {
        return;
      }
      hasSubmittedRef.current = true;
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
        setErrorMessage("Jawaban belum tersimpan. Coba kirim lagi.");
      }
    },
    [questions, router, subtestId],
  );

  const remainingSeconds = useCountdown(durationSeconds, submitAttempt);

  // Soal MEMORY: gambar hanya tampil beberapa detik lalu disembunyikan, dan tidak muncul lagi.
  useEffect(
    function hideMemoryImageAfterDelay() {
      if (currentQuestion?.type !== "MEMORY") {
        return;
      }
      const questionId = currentQuestion.id;
      const timeoutId = window.setTimeout(function hideImage() {
        setHiddenMemoryQuestionIds(function addHidden(previous) {
          return previous.includes(questionId) ? previous : [...previous, questionId];
        });
      }, MEMORY_DISPLAY_SECONDS * 1000);
      return function clearHideTimeout() {
        window.clearTimeout(timeoutId);
      };
    },
    [currentQuestion],
  );

  // Soal SPEED (Perceptual Speed) langsung pindah ke soal berikutnya setelah memilih,
  // karena waktunya sangat ketat.
  const handleSelectOption = useCallback(
    function handleSelectOption(optionKey: string) {
      if (!currentQuestion) {
        return;
      }
      selectedRef.current = { ...selectedRef.current, [currentQuestion.id]: optionKey };
      setSelectedByQuestionId(selectedRef.current);
      if (currentQuestion.type === "SPEED" && currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    },
    [currentIndex, currentQuestion, questions.length],
  );

  // Pintasan keyboard: tombol 1-5 atau huruf A-E memilih opsi pada urutan tersebut.
  useEffect(
    function listenForOptionShortcuts() {
      function handleKeyDown(event: KeyboardEvent) {
        if (!currentQuestion || event.ctrlKey || event.metaKey || event.altKey) {
          return;
        }
        const pressed = event.key.toUpperCase();
        const numericIndex = Number(pressed) - 1;
        const optionIndex = Number.isInteger(numericIndex) && numericIndex >= 0 ? numericIndex : pressed.charCodeAt(0) - 65;
        const isSingleCharacter = pressed.length === 1;
        const option = isSingleCharacter ? currentQuestion.options[optionIndex] : undefined;
        if (option) {
          handleSelectOption(option.key);
        }
      }
      window.addEventListener("keydown", handleKeyDown);
      return function removeKeyDownListener() {
        window.removeEventListener("keydown", handleKeyDown);
      };
    },
    [currentQuestion, handleSelectOption],
  );

  if (!currentQuestion) {
    return <p className="p-6">Subtes ini belum memiliki soal.</p>;
  }

  const answeredCount = Object.keys(selectedByQuestionId).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isTimeAlmostUp = remainingSeconds <= 30;
  const isMemoryVisible = !hiddenMemoryQuestionIds.includes(currentQuestion.id);
  const shouldShowImage =
    currentQuestion.imageSvg !== null && (currentQuestion.type !== "MEMORY" || isMemoryVisible);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="sticky top-0 z-10 -mx-4 mb-6 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div>
          <h1 className="text-base font-semibold">{subtestName}</h1>
          <p className="text-sm text-slate-500">
            Soal {currentIndex + 1} dari {questions.length} · Terjawab {answeredCount}
          </p>
        </div>
        <div
          role="timer"
          aria-live="off"
          className={`rounded-lg px-4 py-2 font-mono text-xl font-bold ${
            isTimeAlmostUp ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          }`}
        >
          {formatClock(remainingSeconds)}
        </div>
      </header>

      <section>
        <p className="whitespace-pre-line text-lg leading-relaxed">{currentQuestion.prompt}</p>

        {shouldShowImage && currentQuestion.imageSvg !== null ? (
          <QuestionImage svgMarkup={currentQuestion.imageSvg} />
        ) : null}
        {currentQuestion.type === "MEMORY" && !isMemoryVisible ? (
          <p className="my-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Gambar sudah disembunyikan. Jawab berdasarkan ingatanmu.
          </p>
        ) : null}

        <ul className="mt-4 space-y-2">
          {currentQuestion.options.map(function renderOption(option) {
            const isSelected = selectedByQuestionId[currentQuestion.id] === option.key;
            return (
              <li key={option.key}>
                <button
                  type="button"
                  onClick={function onClick() {
                    handleSelectOption(option.key);
                  }}
                  aria-pressed={isSelected}
                  className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                      : "border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="font-semibold">{option.key}.</span>
                  <span>{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Pintasan: tekan 1–{currentQuestion.options.length} atau huruf A–{String.fromCharCode(64 + currentQuestion.options.length)} pada keyboard.
          {currentQuestion.type === "SPEED" ? " Setelah memilih, soal berikutnya langsung muncul." : ""}
        </p>
      </section>

      <nav className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={function goPrevious() {
            setCurrentIndex(currentIndex - 1);
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
        >
          Sebelumnya
        </button>

        <div className="flex flex-wrap justify-center gap-1">
          {questions.map(function renderDot(question, index) {
            const isAnswered = selectedByQuestionId[question.id] !== undefined;
            return (
              <button
                key={question.id}
                type="button"
                aria-label={`Ke soal ${index + 1}`}
                onClick={function goTo() {
                  setCurrentIndex(index);
                }}
                className={`h-8 w-8 rounded text-xs font-semibold ${
                  index === currentIndex
                    ? "bg-blue-600 text-white"
                    : isAnswered
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {isLastQuestion ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={submitAttempt}
            className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Mengirim..." : "Selesai"}
          </button>
        ) : (
          <button
            type="button"
            onClick={function goNext() {
              setCurrentIndex(currentIndex + 1);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
          >
            Berikutnya
          </button>
        )}
      </nav>

      {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
