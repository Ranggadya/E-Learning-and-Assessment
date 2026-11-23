"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RunnerHeader, formatClock } from "./RunnerHeader";
import { IconClock } from "@/components/ui/Icons";
import { useCountdown } from "@/hooks/useCountdown";
import type { DrawingConfig, DrawingSubmission, DrawingTaskConfig } from "@/types/assessment";

interface DrawingCanvasStageProps {
  task: DrawingTaskConfig;
  taskIndex: number;
  totalTasks: number;
  onComplete: (submission: DrawingSubmission) => void;
}

function DrawingCanvasStage({ task, taskIndex, totalTasks, onComplete }: DrawingCanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const completedRef = useRef(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const finishTask = useCallback(() => {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    const dataUrl = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";
    onComplete({
      key: task.key,
      title: task.title,
      instruction: task.instruction,
      dataUrl,
    });
  }, [onComplete, task]);

  const remaining = useCountdown(task.seconds, finishTask);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const pt = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : "#0f172a";
    ctx.lineWidth = tool === "eraser" ? 16 : 2.5;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    const pt = getPoint(event);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
        <div>
          <span className="font-mono text-xs font-semibold text-ink-muted">
            Tugas {taskIndex + 1} / {totalTasks}
          </span>
          <h2 className="text-base font-bold text-ink">{task.title}</h2>
          <p className="mt-0.5 text-sm text-ink-secondary">{task.instruction}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold tabular-nums ${
            remaining <= 30
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
              : "border-line bg-canvas text-ink"
          }`}
        >
          <IconClock className="h-3.5 w-3.5" />
          {formatClock(remaining)}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTool("pen")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tool === "pen"
                  ? "bg-brand text-white"
                  : "border border-line bg-canvas text-ink-secondary hover:bg-subtle"
              }`}
            >
              Pensil
            </button>
            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tool === "eraser"
                  ? "bg-brand text-white"
                  : "border border-line bg-canvas text-ink-secondary hover:bg-subtle"
              }`}
            >
              Penghapus
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-subtle hover:text-ink"
            >
              Bersihkan Kanvas
            </button>
          </div>

          <button
            type="button"
            onClick={finishTask}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            {taskIndex + 1 < totalTasks ? "Simpan & Tugas Berikutnya" : "Selesai & Lihat Refleksi"}
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={520}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full touch-none rounded-lg border border-line-strong bg-white cursor-crosshair"
        />
      </div>
    </div>
  );
}

interface DrawingRunnerProps {
  subtestId: number;
  subtestName: string;
  companyName: string;
  packageName: string;
  backHref: string;
  config: DrawingConfig;
}

export function DrawingRunner({
  subtestId,
  subtestName,
  companyName,
  packageName,
  backHref,
  config,
}: DrawingRunnerProps) {
  const router = useRouter();
  const [taskIndex, setTaskIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submissionsRef = useRef<DrawingSubmission[]>([]);
  const submittedRef = useRef(false);

  const submitAll = useCallback(
    async (drawings: DrawingSubmission[]) => {
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
            kind: "DRAWING",
            drawings,
          }),
        });
        if (!response.ok) {
          throw new Error("Gagal menyimpan gambar");
        }
        const data = (await response.json()) as { attemptId: number };
        router.push(`/result/${data.attemptId}`);
      } catch {
        submittedRef.current = false;
        setSubmitting(false);
        setError("Gagal menyimpan gambar. Coba lagi.");
      }
    },
    [router, subtestId],
  );

  const handleCompleteTask = useCallback(
    (submission: DrawingSubmission) => {
      const next = [...submissionsRef.current, submission];
      submissionsRef.current = next;
      if (next.length >= config.tasks.length) {
        void submitAll(next);
      } else {
        setTaskIndex(next.length);
      }
    },
    [config.tasks.length, submitAll],
  );

  const currentTask = config.tasks[taskIndex];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <RunnerHeader
        backHref={backHref}
        companyName={companyName}
        packageName={packageName}
        subtestName={subtestName}
      />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {submitting ? (
          <div className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-ink-secondary">
            Menyimpan hasil gambar...
          </div>
        ) : currentTask ? (
          <DrawingCanvasStage
            key={currentTask.key}
            task={currentTask}
            taskIndex={taskIndex}
            totalTasks={config.tasks.length}
            onComplete={handleCompleteTask}
          />
        ) : null}
      </main>
    </div>
  );
}
