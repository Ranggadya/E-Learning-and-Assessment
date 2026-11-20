"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconRotateCcw } from "@/components/ui/Icons";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300">
          <IconAlertTriangle className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">Terjadi kesalahan pada halaman</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Server gagal memuat data saat ini. Silakan coba muat ulang atau kembali ke halaman utama.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            <IconRotateCcw className="h-4 w-4" />
            <span>Coba lagi</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
          >
            Ke Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
