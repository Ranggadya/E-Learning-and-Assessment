export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export interface EnglishWordInput {
  no: number;
  word: string;
  pos: string;
  meaning_id: string;
  example_en: string;
  example_id: string;
  cefr: CefrLevel;
}

export interface EnglishWord extends EnglishWordInput {
  id: number;
}

export interface EnglishWordWithProgress extends EnglishWord {
  box: number | null;
  next_review_at: string | null;
  correct_count: number;
  wrong_count: number;
}

export interface EnglishLevelSummary {
  cefr: CefrLevel;
  total: number;
  learned: number;
  mastered: number;
  percent: number;
}

export interface EnglishProgressOverview {
  totalWords: number;
  learnedWords: number;
  dueCount: number;
  boxCounts: Record<1 | 2 | 3 | 4 | 5, number>;
  unseenCount: number;
  byLevel: EnglishLevelSummary[];
}

export interface EnglishQuizQuestion {
  wordId: number;
  no: number;
  direction: "en_to_id" | "id_to_en";
  prompt: string;
  pos: string;
  cefr: CefrLevel;
  exampleEn: string;
  exampleId: string;
  options: string[];
  correctAnswer: string;
}

// Jeda hari per kotak Leitner: kotak 1..5 -> 1, 2, 4, 8, 16 hari.
export const LEITNER_BOX_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
};

export function isCefrLevel(value: unknown): value is CefrLevel {
  return typeof value === "string" && (CEFR_LEVELS as readonly string[]).includes(value);
}

export function isValidAnonUserId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(value);
}
