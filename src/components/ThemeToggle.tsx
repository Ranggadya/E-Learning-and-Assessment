"use client";

import { useSyncExternalStore } from "react";
import { IconMoon, IconSun } from "@/components/ui/Icons";

const STORAGE_KEY = "e-assessment:theme";
const THEME_EVENT = "e-assessment:theme-change";

function subscribe(callback: () => void): () => void {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return function unsubscribe() {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getClientSnapshot(): "dark" | "light" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): "dark" | "light" {
  return "light";
}

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Abaikan jika penyimpanan lokal dibatasi browser.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      className={
        compact
          ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
          : "inline-flex w-full items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-secondary transition hover:bg-subtle hover:text-ink"
      }
    >
      {compact ? (
        theme === "dark" ? (
          <IconSun className="h-4 w-4" />
        ) : (
          <IconMoon className="h-4 w-4" />
        )
      ) : (
        <>
          <span className="inline-flex items-center gap-2">
            {theme === "dark" ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
            <span>{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>
          </span>
          <span className="text-xs text-ink-muted">{theme === "dark" ? "Aktif: Gelap" : "Aktif: Terang"}</span>
        </>
      )}
    </button>
  );
}
