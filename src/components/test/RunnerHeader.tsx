"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@/components/ui/Icons";

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface RunnerHeaderProps {
  backHref: string;
  companyName: string;
  packageName: string;
  subtestName: string;
  maxWidthClass?: string;
  rightSlot?: ReactNode;
  confirmExit?: boolean;
}

export function RunnerHeader({
  backHref,
  companyName,
  packageName,
  subtestName,
  maxWidthClass = "max-w-4xl",
  rightSlot,
  confirmExit = false,
}: RunnerHeaderProps) {
  const router = useRouter();
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    if (!confirmExit) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [confirmExit]);

  useEffect(() => {
    if (!exitOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExitOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitOpen]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className={`mx-auto flex ${maxWidthClass} items-center justify-between gap-3 px-4 py-3 sm:px-6`}>
          <div className="flex min-w-0 items-center gap-3">
            {confirmExit ? (
              <button
                type="button"
                onClick={() => setExitOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
                aria-label="Keluar dari pengerjaan"
              >
                <IconArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href={backHref}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
                aria-label="Kembali ke paket"
              >
                <IconArrowLeft className="h-4 w-4" />
              </Link>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs text-ink-muted">
                {companyName} · {packageName}
              </p>
              <h1 className="truncate text-sm font-semibold text-ink sm:text-base">{subtestName}</h1>
            </div>
          </div>
          {rightSlot ? <div className="flex items-center gap-3">{rightSlot}</div> : null}
        </div>
      </header>

      {exitOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="runner-exit-dialog-title"
        >
          <div className="animate-dialog w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
            <h2 id="runner-exit-dialog-title" className="text-lg font-bold text-ink">
              Keluar dari subtes?
            </h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Progres pengerjaan pada sesi ini belum disimpan dan akan hilang jika kamu keluar sekarang.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setExitOpen(false)}
                className="min-h-[40px] rounded-xl border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                Lanjut Mengerjakan
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitOpen(false);
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
    </>
  );
}
