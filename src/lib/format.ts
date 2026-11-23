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
