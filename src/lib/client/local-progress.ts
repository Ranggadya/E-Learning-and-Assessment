"use client";

import { useSyncExternalStore } from "react";
import type {
  LocalAttemptRecord,
  LocalProgressStore,
  SubtestProgress,
} from "@/types/assessment";

const STORAGE_KEY = "e-assessment:progress:v1";
const LAST_SUBMITTED_KEY = "e-assessment:last-submitted-attempt";
const PROGRESS_EVENT = "e-assessment:progress-change";
const MAX_RECENT_ATTEMPTS = 24;

const EMPTY_STORE: LocalProgressStore = {
  bySubtestId: {},
  recentAttempts: [],
};

let cachedRaw: string | null = null;
let cachedStore: LocalProgressStore = EMPTY_STORE;

function parseStore(raw: string | null): LocalProgressStore {
  if (!raw) {
    return EMPTY_STORE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LocalProgressStore>;
    if (!parsed || typeof parsed !== "object") {
      return EMPTY_STORE;
    }
    const bySubtestId =
      parsed.bySubtestId && typeof parsed.bySubtestId === "object" ? parsed.bySubtestId : {};
    const recentAttempts = Array.isArray(parsed.recentAttempts) ? parsed.recentAttempts : [];
    return { bySubtestId, recentAttempts };
  } catch {
    return EMPTY_STORE;
  }
}

function getClientSnapshot(): LocalProgressStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedStore;
    }
    cachedRaw = raw;
    cachedStore = parseStore(raw);
    return cachedStore;
  } catch {
    return EMPTY_STORE;
  }
}

function getServerSnapshot(): LocalProgressStore {
  return EMPTY_STORE;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(PROGRESS_EVENT, callback);
  window.addEventListener("storage", callback);
  return function unsubscribe() {
    window.removeEventListener(PROGRESS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function persistStore(next: LocalProgressStore): void {
  try {
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    cachedRaw = serialized;
    cachedStore = next;
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  } catch {
    // Abaikan jika browser membatasi localStorage (misal private mode penuh).
  }
}

/** Menandai attemptId yang baru saja dikirim oleh tab browser ini agar hanya milik sendiri yang dicatat. */
export function markSubmittedAttempt(attemptId: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(LAST_SUBMITTED_KEY, String(attemptId));
  } catch {
    // Abaikan jika sessionStorage dibatasi browser.
  }
}

export function recordLocalAttempt(record: LocalAttemptRecord): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (window.sessionStorage.getItem(LAST_SUBMITTED_KEY) !== String(record.attemptId)) {
      return;
    }
  } catch {
    return;
  }

  const current = getClientSnapshot();
  const key = String(record.subtestId);
  const existing = current.bySubtestId[key];

  // Idempoten per attemptId (termasuk bila riwayat sudah > 24 sesi) agar refresh/kunjungan ulang tidak menggandakan skor.
  if (
    current.recentAttempts.some((item) => item.attemptId === record.attemptId) ||
    (existing && record.attemptId <= existing.lastAttemptId)
  ) {
    return;
  }
  const nextSubtest: SubtestProgress = existing
    ? {
        bestScore: Math.max(existing.bestScore, record.score),
        lastScore: record.score,
        totalQuestions: record.totalQuestions,
        lastAttemptId: record.attemptId,
        attemptsCount: existing.attemptsCount + 1,
        lastCompletedAt: record.completedAt,
      }
    : {
        bestScore: record.score,
        lastScore: record.score,
        totalQuestions: record.totalQuestions,
        lastAttemptId: record.attemptId,
        attemptsCount: 1,
        lastCompletedAt: record.completedAt,
      };

  const nextStore: LocalProgressStore = {
    bySubtestId: {
      ...current.bySubtestId,
      [key]: nextSubtest,
    },
    recentAttempts: [record, ...current.recentAttempts].slice(0, MAX_RECENT_ATTEMPTS),
  };
  persistStore(nextStore);
}

export function clearLocalProgress(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Abaikan jika dibatasi browser.
  }
  cachedRaw = null;
  cachedStore = EMPTY_STORE;
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function useLocalProgress(): LocalProgressStore {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
