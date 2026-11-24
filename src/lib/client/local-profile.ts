"use client";

import { useSyncExternalStore } from "react";
import type { LocalProfile } from "@/types/assessment";

const STORAGE_KEY = "e-assessment:profile:v1";
const PROFILE_EVENT = "e-assessment:profile-change";
const MAX_DISPLAY_NAME_LENGTH = 40;
const MAX_ROLE_TITLE_LENGTH = 50;

export const DEFAULT_LOCAL_PROFILE: LocalProfile = {
  displayName: "Peserta Mandiri",
  roleTitle: "Persiapan Seleksi Kerja",
};

let cachedRaw: string | null = null;
let cachedProfile: LocalProfile = DEFAULT_LOCAL_PROFILE;

function sanitizeField(value: unknown, maxLength: number, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().slice(0, maxLength).trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function sanitizeLocalProfile(
  input: Partial<LocalProfile> | null | undefined,
): LocalProfile {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_LOCAL_PROFILE };
  }
  return {
    displayName: sanitizeField(
      input.displayName,
      MAX_DISPLAY_NAME_LENGTH,
      DEFAULT_LOCAL_PROFILE.displayName,
    ),
    roleTitle: sanitizeField(
      input.roleTitle,
      MAX_ROLE_TITLE_LENGTH,
      DEFAULT_LOCAL_PROFILE.roleTitle,
    ),
  };
}

function parseProfile(raw: string | null): LocalProfile {
  if (!raw) {
    return DEFAULT_LOCAL_PROFILE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LocalProfile>;
    return sanitizeLocalProfile(parsed);
  } catch {
    return DEFAULT_LOCAL_PROFILE;
  }
}

function getClientSnapshot(): LocalProfile {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedProfile;
    }
    cachedRaw = raw;
    cachedProfile = parseProfile(raw);
    return cachedProfile;
  } catch {
    return DEFAULT_LOCAL_PROFILE;
  }
}

function getServerSnapshot(): LocalProfile {
  return DEFAULT_LOCAL_PROFILE;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(PROFILE_EVENT, callback);
  window.addEventListener("storage", callback);
  return function unsubscribe() {
    window.removeEventListener(PROFILE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function saveLocalProfile(input: Partial<LocalProfile>): void {
  if (typeof window === "undefined") {
    return;
  }
  const current = getClientSnapshot();
  const next = sanitizeLocalProfile({
    displayName: input.displayName !== undefined ? input.displayName : current.displayName,
    roleTitle: input.roleTitle !== undefined ? input.roleTitle : current.roleTitle,
  });
  try {
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    cachedRaw = serialized;
    cachedProfile = next;
    window.dispatchEvent(new Event(PROFILE_EVENT));
  } catch {
    // Abaikan jika browser membatasi localStorage (misal private mode penuh).
  }
}

export function useLocalProfile(): LocalProfile {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
