"use client";

import type { ReactNode } from "react";
import Link from "next/link";
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
}

export function RunnerHeader({
  backHref,
  companyName,
  packageName,
  subtestName,
  maxWidthClass = "max-w-4xl",
  rightSlot,
}: RunnerHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className={`mx-auto flex ${maxWidthClass} items-center justify-between gap-3 px-4 py-3 sm:px-6`}>
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
            aria-label="Kembali ke paket"
          >
            <IconArrowLeft className="h-4 w-4" />
          </Link>
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
  );
}
