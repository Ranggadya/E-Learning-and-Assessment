"use client";

import { useSyncExternalStore } from "react";
import type {
  LocalAttemptRecord,
  LocalProgressStore,
  SubtestProgress,
} from "@/types/assessment";

const STORAGE_KEY = "e-assessment:progress:v1";
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

export function recordLocalAttempt(record: LocalAttemptRecord): void {
  if (typeof window === "undefined") {
    return;
  }
  const current = getClientSnapshot();
  // Idempoten per attemptId agar refresh halaman hasil tidak menggandakan riwayat.
  if (current.recentAttempts.some((item) => item.attemptId === record.attemptId)) {
    return;
  }

  const key = String(record.subtestId);
  const existing = current.bySubtestId[key];
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
