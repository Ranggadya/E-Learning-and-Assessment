"use client";

import { useSyncExternalStore } from "react";

const USER_ID_KEY = "e-assessment:anon-user-id:v1";
let cachedUserId: string | null = null;

export function getOrCreateAnonUserId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  if (cachedUserId) {
    return cachedUserId;
  }
  try {
    const existing = window.localStorage.getItem(USER_ID_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      cachedUserId = existing;
      return existing;
    }
    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? `anon_${crypto.randomUUID().replace(/-/g, "")}`
        : `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(USER_ID_KEY, generated);
    cachedUserId = generated;
    return generated;
  } catch {
    cachedUserId = "anon_fallback_local_user";
    return cachedUserId;
  }
}

function subscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): string | null {
  return null;
}

export function useAnonUserId(): string | null {
  return useSyncExternalStore(subscribe, getOrCreateAnonUserId, getServerSnapshot);
}
