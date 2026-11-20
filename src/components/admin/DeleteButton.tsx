"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@/components/ui/Icons";

interface DeleteButtonProps {
  url: string;
  label: string;
  confirmLabel?: string;
}

export function DeleteButton({ url, label, confirmLabel = "Ya, hapus" }: DeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) {
        setErrorMessage("Gagal menghapus");
        setConfirming(false);
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setErrorMessage("Koneksi gagal");
      setConfirming(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {confirming ? (
        <>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {isDeleting ? "Menghapus..." : confirmLabel}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setConfirming(false)}
            className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary transition hover:bg-subtle hover:text-ink disabled:opacity-60"
          >
            Batal
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setConfirming(true);
          }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/60"
        >
          <IconTrash className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      )}
      {errorMessage ? (
        <span role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {errorMessage}
        </span>
      ) : null}
    </span>
  );
}
