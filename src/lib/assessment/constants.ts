import type { QuestionType, SubtestKind } from "@/types/assessment";

export const SUBTEST_UNIT: Record<SubtestKind, string> = {
  QUIZ: "soal",
  PERSONALITY: "pernyataan",
  PAULI: "kolom",
  DRAWING: "tugas gambar",
};

export const SUBTEST_KIND_LABEL: Record<SubtestKind, string> = {
  QUIZ: "Pilihan Ganda",
  PERSONALITY: "Kepribadian",
  PAULI: "Koran / Pauli",
  DRAWING: "Menggambar",
};

export const OPTION_KEYS = ["A", "B", "C", "D", "E"] as const;

export const VALID_QUESTION_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>([
  "TEXT",
  "IMAGE",
  "MEMORY",
  "SPEED",
]);
