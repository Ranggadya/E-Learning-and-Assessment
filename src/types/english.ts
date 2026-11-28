export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1";

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

export interface EnglishLevelSummary {
  cefr: CefrLevel;
  total: number;
  learned: number;
  percent: number;
}

export interface EnglishProgressOverview {
  totalWords: number;
  learnedWords: number;
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
