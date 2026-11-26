"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCheckCircle,
  IconXCircle,
} from "@/components/ui/Icons";
import { useAnonUserId } from "@/lib/client/anon-user";
import type {
  LessonProgressStatus,
  LessonQuizPublicQuestion,
} from "@/types/belajar";

interface LessonInteractiveFooterProps {
  lessonId: number;
  lessonSlug: string;
  initialStatus: LessonProgressStatus | null;
  initialQuizScore: number | null;
  quizQuestions: LessonQuizPublicQuestion[];
}

export function LessonInteractiveFooter({
  lessonId,
  lessonSlug,
  initialStatus,
  initialQuizScore,
  quizQuestions,
}: LessonInteractiveFooterProps) {
  const router = useRouter();
  const userKey = useAnonUserId();
  const [status, setStatus] = useState<LessonProgressStatus | null>(initialStatus);
  const [savingDone, setSavingDone] = useState(false);

  const [selected, setSelected] = useState<Record<number, string>>({});
  const [grading, setGrading] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    scorePercent: number;
    correctCount: number;
    totalQuestions: number;
    results: Array<{
      questionId: number;
      correctOption: string;
      isCorrect: boolean;
      explanation: string | null;
    }>;
  } | null>(null);

  const startedSentRef = useRef(false);

  // Catat status 'started' otomatis saat pelajaran pertama kali dibuka.
  useEffect(() => {
    if (!userKey || status !== null || startedSentRef.current) return;
    startedSentRef.current = true;
    fetch("/api/belajar/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userKey, lessonId, status: "started" }),
    })
      .then((res) => {
        if (res.ok) setStatus((prev) => prev ?? "started");
      })
      .catch(() => undefined);
  }, [lessonId, status, userKey]);

  async function handleMarkDone() {
    if (!userKey || savingDone) return;
    setSavingDone(true);
    try {
      const res = await fetch("/api/belajar/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userKey, lessonId, status: "done" }),
      });
      if (res.ok) {
        setStatus("done");
        router.refresh();
      }
    } finally {
      setSavingDone(false);
    }
  }

  async function handleSubmitQuiz() {
    if (!userKey || grading || quizQuestions.length === 0) return;
    setGrading(true);
    try {
      const res = await fetch("/api/belajar/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userKey,
          lessonId,
          lessonSlug,
          answers: quizQuestions.map((q) => ({
            questionId: q.id,
            selectedOption: selected[q.id] ?? null,
          })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as NonNullable<typeof quizResult>;
        setQuizResult(data);
        router.refresh();
      }
    } finally {
      setGrading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Kuis Akhir Pelajaran (memakai tabel questions yang sudah ada) */}
      {quizQuestions.length > 0 ? (
        <section
          aria-label="Kuis akhir pelajaran"
          className="rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-ink">Kuis Pemahaman</h2>
              <p className="text-xs text-ink-secondary">
                Uji pemahamanmu sebelum menandai pelajaran ini selesai ({quizQuestions.length} soal).
              </p>
            </div>
            {quizResult ? (
              <span className="rounded-xl bg-brand-soft px-3 py-1 font-mono text-xs font-bold tabular-nums text-brand-text">
                Skor: {quizResult.correctCount}/{quizResult.totalQuestions} ({quizResult.scorePercent}%)
              </span>
            ) : initialQuizScore !== null ? (
              <span className="rounded-xl bg-subtle px-3 py-1 font-mono text-xs font-semibold tabular-nums text-ink-secondary">
                Skor terakhir: {initialQuizScore}%
              </span>
            ) : null}
          </div>

          <ol className="mt-5 space-y-5">
            {quizQuestions.map((q, idx) => {
              const gradedItem = quizResult?.results.find((r) => r.questionId === q.id);
              return (
                <li key={q.id} className="space-y-2.5">
                  <p className="text-sm font-bold text-ink">
                    <span className="mr-1.5 font-mono text-xs text-ink-muted">{idx + 1}.</span>
                    {q.prompt}
                  </p>
                  <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {q.options.map((opt) => {
                      const isPicked = selected[q.id] === opt.key;
                      const isRight = gradedItem?.correctOption === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          disabled={grading}
                          onClick={() =>
                            setSelected((prev) => ({ ...prev, [q.id]: opt.key }))
                          }
                          className={`flex min-h-[44px] w-full items-start gap-3 px-3.5 py-2.5 text-left text-sm transition ${
                            gradedItem
                              ? isRight
                                ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-200"
                                : isPicked
                                  ? "bg-rose-50 text-rose-950 dark:bg-rose-950/50 dark:text-rose-200"
                                  : "bg-surface text-ink"
                              : isPicked
                                ? "bg-brand-soft text-ink"
                                : "bg-surface text-ink hover:bg-subtle/60"
                          }`}
                        >
                          <span className="font-mono text-xs font-bold text-ink-secondary">
                            {opt.key}.
                          </span>
                          <span className="flex-1">{opt.label}</span>
                          {gradedItem && isRight ? (
                            <IconCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : gradedItem && isPicked && !isRight ? (
                            <IconXCircle className="h-4 w-4 shrink-0 text-rose-600" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {gradedItem?.explanation ? (
                    <p className="rounded-xl bg-canvas px-3.5 py-2.5 text-xs leading-relaxed text-ink-secondary">
                      <strong className="text-ink">Pembahasan:</strong> {gradedItem.explanation}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className="mt-5 border-t border-line pt-4">
            <button
              type="button"
              disabled={grading}
              onClick={handleSubmitQuiz}
              className="inline-flex min-h-[40px] items-center rounded-xl border border-line-strong bg-surface px-4 py-2 text-xs font-bold text-ink transition hover:bg-subtle disabled:opacity-50"
            >
              {grading ? "Menilai..." : "Periksa Jawaban Kuis"}
            </button>
          </div>
        </section>
      ) : null}

      {/* Bar Tandai Selesai */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ink">
            {status === "done"
              ? "Pelajaran ini sudah ditandai selesai"
              : "Sudah memahami materi ini?"}
          </p>
          <p className="text-xs text-ink-muted">
            Menandai selesai akan memperbarui persen kemajuan jalur dan membuka pelajaran berikutnya.
          </p>
        </div>

        <button
          type="button"
          disabled={savingDone || status === "done"}
          onClick={handleMarkDone}
          className={`inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
            status === "done"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
          }`}
        >
          <IconCheckCircle className="h-4 w-4" />
          <span>
            {status === "done"
              ? "Selesai Dipelajari"
              : savingDone
                ? "Menyimpan..."
                : "Tandai selesai"}
          </span>
        </button>
      </div>
    </div>
  );
}
