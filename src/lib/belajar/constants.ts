import type { LessonLevel, LessonOrigin } from "@/types/belajar";

export const BELAJAR_CACHE_TAG = "belajar";

export const LESSON_LEVEL_LABEL: Record<LessonLevel, string> = {
  pemula: "Pemula",
  menengah: "Menengah",
  lanjut: "Lanjut",
};

export const LESSON_ORIGIN_LABEL: Record<LessonOrigin, string> = {
  original: "Asli",
  translated: "Terjemahan",
  mixed: "Campuran",
};
