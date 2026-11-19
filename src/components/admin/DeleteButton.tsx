"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteButtonProps {
  url: string;
  label: string;
  confirmMessage: string;
}

export function DeleteButton({ url, label, confirmMessage }: DeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) {
        setErrorMessage("Gagal menghapus");
        return;
      }
      router.refresh();
    } catch {
      setErrorMessage("Tidak bisa menghubungi server");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-sm text-red-600 hover:underline disabled:opacity-60"
      >
        {isDeleting ? "Menghapus..." : label}
      </button>
      {errorMessage ? <span className="ml-2 text-xs text-red-600">{errorMessage}</span> : null}
    </span>
  );
}
