"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { RunnerHeader } from "./RunnerHeader";
import { IconClock } from "@/components/ui/Icons";
import { useCountdown } from "@/hooks/useCountdown";
import { markSubmittedAttempt } from "@/lib/client/local-progress";
import type { PauliColumnStat, PauliConfig } from "@/types/assessment";

function generateColumns(columns: number, digitsPerColumn: number): number[][] {
  return Array.from({ length: columns }, () =>
    Array.from({ length: digitsPerColumn }, () => Math.floor(Math.random() * 9) + 1),
  );
}

interface PauliColumnStageProps {
  columnIndex: number;
  totalColumns: number;
  digits: number[];
  secondsPerColumn: number;
  finishEarlyRef: MutableRefObject<(() => void) | null>;
  onFinishColumn: (stat: PauliColumnStat, endAll: boolean) => void;
}

function PauliColumnStage({
  columnIndex,
  totalColumns,
  digits,
  secondsPerColumn,
  finishEarlyRef,
  onFinishColumn,
}: PauliColumnStageProps) {
  const totalPairs = Math.max(1, digits.length - 1);
  const [pairIndex, setPairIndex] = useState(0);
  const finishedRef = useRef(false);
  const statsRef = useRef({ answered: 0, correct: 0 });

  const finish = useCallback(
    (endAll = false) => {
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      onFinishColumn(
        {
          column: columnIndex + 1,
          answered: statsRef.current.answered,
          correct: statsRef.current.correct,
        },
        endAll,
      );
    },
    [columnIndex, onFinishColumn],
  );

  useEffect(() => {
    finishEarlyRef.current = () => finish(true);
    return () => {
      finishEarlyRef.current = null;
    };
  }, [finish, finishEarlyRef]);

  const remaining = useCountdown(secondsPerColumn, () => finish(false));

  const handleDigit = useCallback(
    (inputDigit: number) => {
      if (finishedRef.current || pairIndex >= totalPairs) {
        return;
      }
      const expected = (digits[pairIndex] + digits[pairIndex + 1]) % 10;
      const isRight = inputDigit === expected;
      statsRef.current = {
        answered: statsRef.current.answered + 1,
        correct: statsRef.current.correct + (isRight ? 1 : 0),
      };

      if (pairIndex + 1 >= totalPairs) {
        finish(false);
      } else {
        setPairIndex(pairIndex + 1);
      }
    },
    [digits, finish, pairIndex, totalPairs],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        handleDigit(Number(event.key));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDigit]);

  const topDigit = digits[pairIndex];
  const bottomDigit = digits[pairIndex + 1];

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-sm">
        <span className="font-medium text-ink-secondary tabular-nums">
          Kolom <strong className="text-ink">{columnIndex + 1}</strong> / {totalColumns}
        </span>
        <span className="font-mono text-xs tabular-nums text-ink-muted">
          Pasangan {Math.min(pairIndex + 1, totalPairs)}/{totalPairs}
        </span>
        <span
          className={`inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums ${
            remaining <= 5 ? "text-red-600 dark:text-red-400" : "text-ink"
          }`}
        >
          <IconClock className="h-3.5 w-3.5" />
          {remaining}d
        </span>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-line bg-surface px-6 py-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <p className="text-xs font-medium text-ink-muted">
          Jumlahkan kedua angka, ketik <strong className="text-ink">digit satuannya</strong> saja
        </p>
        <div className="mt-5 flex flex-col items-center gap-2 font-mono text-5xl font-bold tabular-nums text-ink">
          <span className="flex h-16 w-20 items-center justify-center rounded-xl border border-line bg-canvas">
            {topDigit}
          </span>
          <span className="text-lg font-semibold text-ink-muted">+</span>
          <span className="flex h-16 w-20 items-center justify-center rounded-xl border border-brand/50 bg-brand-soft/40 text-brand-text">
            {bottomDigit}
          </span>
        </div>

        <div className="mt-7 grid w-full max-w-xs grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="rounded-lg border border-line-strong bg-canvas py-3 font-mono text-lg font-bold text-ink transition hover:border-brand hover:bg-brand-soft/60 active:scale-95"
            >
              {num}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-muted">Tip: bisa langsung tekan angka 0–9 di keyboard</p>
      </div>
    </div>
  );
}

interface PauliRunnerProps {
  subtestId: number;
  subtestName: string;
  companyName: string;
  packageName: string;
  backHref: string;
  config: PauliConfig;
}

export function PauliRunner({
  subtestId,
  subtestName,
  companyName,
  packageName,
  backHref,
  config,
}: PauliRunnerProps) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [grid, setGrid] = useState<number[][]>([]);
  const [colIndex, setColIndex] = useState(0);
  const [finishedCount, setFinishedCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completedStatsRef = useRef<PauliColumnStat[]>([]);
  const finishEarlyRef = useRef<(() => void) | null>(null);
  const submittedRef = useRef(false);

  const submitAll = useCallback(
    async (finalStats: PauliColumnStat[]) => {
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
            kind: "PAULI",
            perColumn: finalStats,
          }),
        });
        if (!response.ok) {
          throw new Error("Gagal menyimpan hasil");
        }
        const data = (await response.json()) as { attemptId: number };
        markSubmittedAttempt(data.attemptId);
        router.push(`/result/${data.attemptId}`);
      } catch {
        submittedRef.current = false;
        setSubmitting(false);
        setError("Gagal menyimpan hasil Pauli karena gangguan koneksi. Klik tombol di bawah untuk mengirim ulang.");
      }
    },
    [router, subtestId],
  );

  const handleFinishColumn = useCallback(
    (stat: PauliColumnStat, endAll: boolean) => {
      const next = [...completedStatsRef.current, stat];
      completedStatsRef.current = next;
      if (endAll || next.length >= config.columns) {
        setFinishedCount(next.length);
        void submitAll(next);
      } else {
        setColIndex(next.length);
      }
    },
    [config.columns, submitAll],
  );

  const isFinishedAll = finishedCount !== null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <RunnerHeader
        backHref={backHref}
        companyName={companyName}
        packageName={packageName}
        subtestName={subtestName}
        maxWidthClass="max-w-3xl"
        confirmExit={started && !submitting && !isFinishedAll}
        rightSlot={
          started && !submitting && !isFinishedAll ? (
            <button
              type="button"
              onClick={() => {
                if (finishEarlyRef.current) {
                  finishEarlyRef.current();
                } else {
                  setFinishedCount(completedStatsRef.current.length);
                  void submitAll(completedStatsRef.current);
                }
              }}
              className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-subtle"
            >
              Akhiri Lebih Awal
            </button>
          ) : null
        }
      />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
          >
            {error}
          </div>
        ) : null}

        {!started ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-bold text-ink">Aturan Tes Koran / Pauli</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-secondary">
              <li>
                Terdapat <strong className="text-ink">{config.columns} kolom</strong>, masing-masing berdurasi{" "}
                <strong className="text-ink">{config.secondsPerColumn} detik</strong>.
              </li>
              <li>
                Jumlahkan dua angka yang tampil dan masukkan <strong className="text-ink">digit satuannya</strong> saja
                (contoh: 7 + 8 = 15 → ketik <code className="font-mono font-bold text-ink">5</code>).
              </li>
              <li>Kerjakan secepat dan seteliti mungkin; kolom berpindah otomatis saat waktu habis.</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                setGrid(generateColumns(config.columns, config.digitsPerColumn));
                setStarted(true);
              }}
              className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Mulai Tes Pauli
            </button>
          </div>
        ) : submitting ? (
          <div className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-ink-secondary">
            Menyimpan hasil tes...
          </div>
        ) : isFinishedAll ? (
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-bold text-ink">Sesi Pauli Selesai</h2>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Hasil pengerjaan <strong className="tabular-nums text-ink">{finishedCount} kolom</strong> siap dikirim ke server.
            </p>
            <button
              type="button"
              onClick={() => void submitAll(completedStatsRef.current)}
              className="mt-5 min-h-[40px] w-full rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Kirim Ulang Hasil
            </button>
          </div>
        ) : grid[colIndex] ? (
          <PauliColumnStage
            key={colIndex}
            columnIndex={colIndex}
            totalColumns={config.columns}
            digits={grid[colIndex]}
            secondsPerColumn={config.secondsPerColumn}
            finishEarlyRef={finishEarlyRef}
            onFinishColumn={handleFinishColumn}
          />
        ) : null}
      </main>
    </div>
  );
}
