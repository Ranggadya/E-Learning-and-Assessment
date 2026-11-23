import type { CefrLevel } from "@/types/english";

export const CEFR_LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"] as const;

// Jeda hari per kotak Leitner: kotak 1..5 -> 1, 2, 4, 8, 16 hari.
export const LEITNER_BOX_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
};
