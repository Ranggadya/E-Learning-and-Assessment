export const MAX_PG_INT4 = 2_147_483_647;

/** Memvalidasi ID PostgreSQL SERIAL (INT4 positif 1..2147483647) dari string URL maupun angka JSON. */
export function parsePgInt4Id(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 && raw <= MAX_PG_INT4 ? raw : null;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 && id <= MAX_PG_INT4 ? id : null;
  }
  return null;
}

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
  const formatted = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${formatted} WIB`;
}
