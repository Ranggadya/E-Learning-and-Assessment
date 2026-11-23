export const ADMIN_BADGE_TONES = {
  neutral: "border border-line-strong bg-subtle text-ink-secondary",
  emerald:
    "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300",
  amber:
    "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/60 dark:text-amber-300",
  rose:
    "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/60 dark:text-rose-300",
  brand: "border border-brand/30 bg-brand-soft text-brand-text",
} as const;

export function formatDurationLabel(seconds: number): string {
  if (seconds <= 0) {
    return "0 detik";
  }
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60} menit`;
  }
  if (seconds < 60) {
    return `${seconds} detik`;
  }
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins} menit ${rem} dtk`;
}

export function formatDateTimeId(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
