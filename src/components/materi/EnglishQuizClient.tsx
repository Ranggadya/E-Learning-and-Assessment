"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconCheckCircle,
  IconRotateCcw,
  IconXCircle,
} from "@/components/ui/Icons";
import { LevelBadge } from "@/components/ui/QuestionTypeBadge";
import {
  CEFR_LEVELS,
  type CefrLevel,
  type EnglishQuizQuestion,
} from "@/lib/english";

interface EnglishQuizClientProps {
  initialCefr: CefrLevel | "";
}

export function EnglishQuizClient({ initialCefr }: EnglishQuizClientProps) {
  const [cefr, setCefr] = useState<CefrLevel | "">(initialCefr);
  const [reloadTick, setReloadTick] = useState(0);
  const [questions, setQuestions] = useState<EnglishQuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const qs = cefr ? `?cefr=${cefr}` : "";
    fetch(`/api/materi/quiz${qs}`)
      .then((res) => res.json())
      .then((data: { questions?: EnglishQuizQuestion[] }) => {
        if (!active) return;
        setQuestions(data.questions ?? []);
        setAnswers({});
        setCurrentIdx(0);
        setSubmitted(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cefr, reloadTick]);

  const currentQ = questions[currentIdx];

  function selectOption(option: string) {
    if (submitted || !currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentIdx]: option }));
  }

  function handleSelectCefr(next: CefrLevel | "") {
    setLoading(true);
    setCefr(next);
  }

  function handleNewQuiz() {
    setLoading(true);
    setReloadTick((t) => t + 1);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (submitted || loading || !currentQ) return;
      if (["1", "2", "3", "4"].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const opt = currentQ.options[idx];
        if (opt) {
          e.preventDefault();
          setAnswers((prev) => ({ ...prev, [currentIdx]: opt }));
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submitted, loading, currentQ, currentIdx]);

  const correctCount = questions.reduce(
    (sum, q, i) => sum + (answers[i] === q.correctAnswer ? 1 : 0),
    0,
  );
  const wrongItems = questions
    .map((q, i) => ({ question: q, index: i, selected: answers[i] ?? null }))
    .filter((item) => item.selected !== item.question.correctAnswer);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/materi/kamus"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary transition hover:text-ink"
        >
          <IconArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Kamus</span>
        </Link>
        <Link
          href="/materi/kamus/belajar"
          className="text-xs font-semibold text-brand-text hover:underline"
        >
          Ke Mode Flashcard
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Kuis Kosakata (10 Soal)
          </h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Pilihan ganda otomatis (Kata → Arti &amp; Arti → Kata) dengan pengecoh selevel dan jenis kata sama.
          </p>
        </div>

        {/* Filter Level */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelectCefr("")}
            className={`rounded-md border px-2.5 py-1 text-xs font-bold transition ${
              cefr === ""
                ? "border-brand bg-brand text-white"
                : "border-line-strong bg-surface text-ink-secondary hover:bg-subtle"
            }`}
          >
            Semua
          </button>
          {CEFR_LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => handleSelectCefr(lvl)}
              className={`rounded-md border px-2.5 py-1 text-xs font-bold transition ${
                cefr === lvl
                  ? "border-brand bg-brand text-white"
                  : "border-line-strong bg-surface text-ink-secondary hover:bg-subtle"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-[10px] border border-line-strong bg-surface p-10 text-center text-sm text-ink-secondary">
          Menyusun 10 soal kuis acak...
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-[10px] border border-line-strong bg-surface p-8 text-center text-sm text-ink-secondary">
          Belum cukup kata di database untuk membuat kuis.
        </div>
      ) : submitted ? (
        <div className="space-y-5">
          {/* Kartu Skor */}
          <div className="rounded-[10px] border border-line-strong bg-surface p-6 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Hasil Kuis Kosakata
            </span>
            <p className="mt-2 text-4xl font-extrabold tabular-nums text-brand-text">
              {correctCount} / {questions.length}
            </p>
            <p className="mt-1 text-xs text-ink-secondary">
              Akurasi {Math.round((correctCount / questions.length) * 100)}%
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={handleNewQuiz}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
              >
                <IconRotateCcw className="h-3.5 w-3.5" />
                <span>Mainkan Kuis Baru</span>
              </button>
              <Link
                href="/materi/kamus"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-canvas px-4 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
              >
                <span>Buka Kamus</span>
              </Link>
            </div>
          </div>

          {/* Daftar Jawaban yang Salah */}
          {wrongItems.length === 0 ? (
            <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-5 text-center text-sm font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
              <IconCheckCircle className="mx-auto mb-2 h-7 w-7 text-emerald-600" />
              Sempurna! Semua 10 soal dijawab dengan benar.
            </div>
          ) : (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-ink">
                Pembahasan Jawaban yang Salah / Kosong ({wrongItems.length} soal)
              </h2>
              {wrongItems.map(({ question, index, selected }) => (
                <article
                  key={`${question.wordId}-${index}`}
                  className="rounded-[10px] border border-line-strong bg-surface p-4 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">
                      Soal #{index + 1} ·{" "}
                      {question.direction === "en_to_id" ? "Inggris → Indonesia" : "Indonesia → Inggris"}
                    </span>
                    <LevelBadge level={question.cefr} />
                  </div>
                  <p className="mt-1.5 text-base font-extrabold text-ink">
                    {question.prompt}{" "}
                    <span className="font-mono text-xs font-normal text-ink-muted">
                      ({question.pos})
                    </span>
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                      <IconXCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Jawabanmu: {selected ?? "(Tidak dijawab)"}</span>
                    </p>
                    <p className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                      <IconCheckCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Jawaban benar: {question.correctAnswer}</span>
                    </p>
                  </div>
                  <div className="mt-2.5 rounded border border-line bg-canvas px-3 py-2 text-ink-secondary">
                    <p className="font-medium text-ink">&ldquo;{question.exampleEn}&rdquo;</p>
                    <p>{question.exampleId}</p>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      ) : currentQ ? (
        <div className="space-y-4">
          {/* Palette Nomor 1..10 */}
          <div className="flex flex-wrap items-center gap-1.5">
            {questions.map((_, i) => {
              const isCurrent = i === currentIdx;
              const isAnswered = Boolean(answers[i]);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIdx(i)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold tabular-nums transition ${
                    isCurrent
                      ? "bg-brand text-white"
                      : isAnswered
                        ? "border border-brand/40 bg-brand-soft text-brand-text"
                        : "border border-line-strong bg-surface text-ink-secondary"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Kartu Soal */}
          <div className="rounded-[10px] border border-line-strong bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink-muted">
                Soal {currentIdx + 1} / {questions.length} ·{" "}
                {currentQ.direction === "en_to_id"
                  ? "Pilih arti bahasa Indonesia yang tepat"
                  : "Pilih kata bahasa Inggris yang tepat"}
              </span>
              <LevelBadge level={currentQ.cefr} />
            </div>

            <div className="my-5">
              <span className="rounded border border-line bg-subtle px-2 py-0.5 font-mono text-xs text-ink-secondary">
                {currentQ.pos}
              </span>
              <p className="mt-2 text-2xl font-extrabold text-ink">{currentQ.prompt}</p>
            </div>

            <div className="space-y-2">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = answers[currentIdx] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => selectOption(opt)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                      isSelected
                        ? "border-brand bg-brand-soft font-bold text-brand-text"
                        : "border-line-strong bg-canvas font-medium text-ink hover:bg-subtle"
                    }`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line-strong bg-surface font-mono text-xs font-bold">
                      {optIdx + 1}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-ink disabled:opacity-40"
              >
                Sebelumnya
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
                >
                  Soal Berikutnya
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  Selesai &amp; Lihat Hasil
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
