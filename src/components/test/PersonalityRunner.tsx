"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RunnerHeader, formatClock } from "./RunnerHeader";
import { IconClock } from "@/components/ui/Icons";
import { useCountdown } from "@/hooks/useCountdown";
import { markSubmittedAttempt } from "@/lib/client/local-progress";
import type { PersonalityConfig } from "@/types/assessment";

const SCALE_OPTIONS = [
  { value: 1, label: "Sangat Tidak Setuju", short: "1" },
  { value: 2, label: "Tidak Setuju", short: "2" },
  { value: 3, label: "Netral", short: "3" },
  { value: 4, label: "Setuju", short: "4" },
  { value: 5, label: "Sangat Setuju", short: "5" },
];

interface PersonalityRunnerProps {
  subtestId: number;
  subtestName: string;
  companyName: string;
  packageName: string;
  backHref: string;
  durationSeconds: number;
  config: PersonalityConfig;
}

export function PersonalityRunner({
  subtestId,
  subtestName,
  companyName,
  packageName,
  backHref,
  durationSeconds,
  config,
}: PersonalityRunnerProps) {
  const router = useRouter();
  const [ratings, setRatings] = useState<Array<number | null>>(() =>
    Array.from({ length: config.statements.length }, () => null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const ratingsRef = useRef(ratings);
  const cancelConfirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirmOpen) {
      return;
    }
    cancelConfirmRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfirmOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen]);

  const submit = useCallback(async () => {
    if (submittedRef.current) {
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtestId,
          kind: "PERSONALITY",
          ratings: ratingsRef.current,
        }),
      });
      if (!response.ok) {
        throw new Error("Gagal menyimpan jawaban");
      }
      const data = (await response.json()) as { attemptId: number };
      markSubmittedAttempt(data.attemptId);
      router.push(`/result/${data.attemptId}`);
    } catch {
      submittedRef.current = false;
      setSubmitting(false);
      setError("Gagal mengirim jawaban. Periksa koneksi lalu coba lagi.");
    }
  }, [router, subtestId]);

  const remaining = useCountdown(durationSeconds, submit);
  const isLocked = submitting || remaining <= 0;
  const answeredCount = ratings.filter((r) => r !== null).length;
  const unansweredCount = config.statements.length - answeredCount;

  function handleManualSubmit() {
    if (remaining > 0 && unansweredCount > 0) {
      setConfirmOpen(true);
      return;
    }
    void submit();
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <RunnerHeader
        backHref={backHref}
        companyName={companyName}
        packageName={packageName}
        subtestName={subtestName}
        confirmExit={!submitting && answeredCount > 0}
        rightSlot={
          <>
            <span className="hidden font-mono text-xs tabular-nums text-ink-secondary sm:inline">
              {answeredCount}/{config.statements.length} dijawab
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums ${
                remaining <= 60
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
                  : "border-line bg-canvas text-ink"
              }`}
            >
              <IconClock className="h-3.5 w-3.5" />
              {formatClock(remaining)}
            </span>
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={submitting}
              className="rounded-lg bg-brand px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : "Selesai"}
            </button>
          </>
        }
      />

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <div className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-secondary">
          Jawablah setiap pernyataan sejujurnya sesuai kebiasaan kerjamu sehari-hari. Tidak ada jawaban benar atau salah.
          Skala: <strong className="text-ink">1</strong> = Sangat Tidak Setuju sampai{" "}
          <strong className="text-ink">5</strong> = Sangat Setuju.
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
          >
            {error}
          </div>
        ) : null}

        <ol className="space-y-3">
          {config.statements.map((stmt, idx) => {
            const selected = ratings[idx];
            return (
              <li
                key={idx}
                className="rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5"
              >
                <p className="text-sm font-medium leading-relaxed text-ink sm:text-[15px]">
                  <span className="mr-2 font-mono text-xs font-semibold tabular-nums text-ink-muted">
                    {idx + 1}.
                  </span>
                  {stmt.text}
                </p>

                <div className="mt-3.5 grid grid-cols-5 gap-2">
                  {SCALE_OPTIONS.map((opt) => {
                    const active = selected === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isLocked}
                        onClick={() =>
                          setRatings((prev) => {
                            const next = [...prev];
                            next[idx] = opt.value;
                            ratingsRef.current = next;
                            return next;
                          })
                        }
                        aria-pressed={active}
                        className={`flex flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition disabled:opacity-60 ${
                          active
                            ? "border-brand bg-brand text-white"
                            : "border-line bg-canvas text-ink-secondary hover:border-brand/50 hover:bg-subtle hover:text-ink"
                        }`}
                      >
                        <span className="font-mono text-sm font-bold">{opt.short}</span>
                        <span className="mt-0.5 hidden text-xs leading-tight sm:block">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
          <span className="text-sm text-ink-secondary tabular-nums">
            Terjawab <strong className="text-ink">{answeredCount}</strong> dari {config.statements.length} pernyataan
          </span>
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={submitting}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "Kumpulkan Jawaban"}
          </button>
        </div>
      </main>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="personality-confirm-title"
        >
          <div
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-[1px]"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="animate-dialog relative w-full max-w-md rounded-xl border border-line-strong bg-surface p-5 shadow-xl sm:p-6">
            <h2 id="personality-confirm-title" className="text-base font-bold text-ink">
              Kumpulkan jawaban sekarang?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Masih ada <strong className="text-ink tabular-nums">{unansweredCount}</strong> pernyataan yang belum dijawab. Pernyataan kosong tidak dihitung pada profil sifatmu.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2.5">
              <button
                ref={cancelConfirmRef}
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="min-h-[40px] rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                Lanjutkan Mengisi
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setConfirmOpen(false);
                  void submit();
                }}
                className="min-h-[40px] rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
