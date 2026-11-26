"use client";

import { useState } from "react";
import { IconCheckCircle } from "@/components/ui/Icons";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Abaikan jika clipboard tidak tersedia di konteks non-HTTPS.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
    >
      {copied ? (
        <>
          <IconCheckCircle className="h-3.5 w-3.5 text-emerald-400" />
          <span>Tersalin</span>
        </>
      ) : (
        <span>Salin</span>
      )}
    </button>
  );
}
