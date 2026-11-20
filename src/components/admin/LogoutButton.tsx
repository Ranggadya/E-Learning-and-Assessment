"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLogOut } from "@/components/ui/Icons";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-subtle hover:text-ink disabled:opacity-60 sm:text-sm"
    >
      <IconLogOut className="h-3.5 w-3.5" />
      <span>{isLoggingOut ? "Keluar..." : "Keluar"}</span>
    </button>
  );
}
