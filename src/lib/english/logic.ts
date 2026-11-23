import type {
  CefrLevel,
  EnglishQuizQuestion,
  EnglishWord,
  EnglishWordInput,
} from "@/types/english";
import { CEFR_LEVELS, LEITNER_BOX_DAYS } from "./constants";

export function isCefrLevel(value: unknown): value is CefrLevel {
  return typeof value === "string" && (CEFR_LEVELS as readonly string[]).includes(value);
}

export function isValidAnonUserId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(value);
}

export function computeNextLeitnerState(
  currentBox: number | null | undefined,
  known: boolean,
  now: Date = new Date(),
): { nextBox: number; intervalDays: number; nextReviewAt: Date } {
  const baseBox =
    typeof currentBox === "number" && currentBox >= 1 && currentBox <= 5 ? currentBox : 0;
  const nextBox = known ? Math.min(5, baseBox === 0 ? 2 : baseBox + 1) : 1;
  const intervalDays = LEITNER_BOX_DAYS[nextBox] ?? 1;
  const nextReviewAt = new Date(now.getTime() + intervalDays * 86_400_000);
  return { nextBox, intervalDays, nextReviewAt };
}

export function validateEnglishWordsJson(
  raw: unknown,
): { ok: true; words: EnglishWordInput[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(raw)) {
    return { ok: false, errors: ["Format JSON harus berupa array daftar kata."] };
  }
  if (raw.length === 0) {
    return { ok: false, errors: ["Array kata tidak boleh kosong."] };
  }
  if (raw.length > 10_000) {
    return { ok: false, errors: ["Maksimal 10.000 kata dalam satu file."] };
  }

  const errors: string[] = [];
  const seenNo = new Set<number>();
  const words: EnglishWordInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const label = `Baris #${i + 1}`;
    if (!item || typeof item !== "object") {
      errors.push(`${label}: harus berupa objek.`);
      if (errors.length >= 30) break;
      continue;
    }
    const rec = item as Record<string, unknown>;
    const no = rec.no;
    const word = typeof rec.word === "string" ? rec.word.trim() : "";
    const pos = typeof rec.pos === "string" ? rec.pos.trim() : "";
    const meaning_id = typeof rec.meaning_id === "string" ? rec.meaning_id.trim() : "";
    const example_en = typeof rec.example_en === "string" ? rec.example_en.trim() : "";
    const example_id = typeof rec.example_id === "string" ? rec.example_id.trim() : "";
    const cefr = rec.cefr;

    if (typeof no !== "number" || !Number.isInteger(no) || no < 1) {
      errors.push(`${label}: 'no' harus bilangan bulat positif.`);
    } else if (seenNo.has(no)) {
      errors.push(`${label}: nomor urut 'no' (${no}) duplikat dalam file.`);
    } else {
      seenNo.add(no);
    }

    if (!word) errors.push(`${label}: 'word' wajib diisi.`);
    if (!pos) errors.push(`${label}: 'pos' wajib diisi.`);
    if (!meaning_id) errors.push(`${label}: 'meaning_id' wajib diisi.`);
    if (!example_en) errors.push(`${label}: 'example_en' wajib diisi.`);
    if (!example_id) errors.push(`${label}: 'example_id' wajib diisi.`);
    if (!isCefrLevel(cefr)) {
      errors.push(`${label}: 'cefr' harus salah satu dari A1, A2, B1, B2, C1.`);
    }

    if (errors.length >= 30) break;

    if (
      typeof no === "number" &&
      Number.isInteger(no) &&
      no >= 1 &&
      word &&
      pos &&
      meaning_id &&
      example_en &&
      example_id &&
      isCefrLevel(cefr)
    ) {
      words.push({ no, word, pos, meaning_id, example_en, example_id, cefr });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, words };
}

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function buildQuizQuestionsFromPool(
  pool: EnglishWord[],
  count = 10,
): EnglishQuizQuestion[] {
  if (pool.length < 4) {
    return [];
  }

  const targets = shuffleArray(pool).slice(0, Math.min(count, pool.length));

  return targets.map((target, index) => {
    const direction: "en_to_id" | "id_to_en" = index % 2 === 0 ? "en_to_id" : "id_to_en";
    const valueOf = (w: EnglishWord) => (direction === "en_to_id" ? w.meaning_id : w.word);
    const correctAnswer = valueOf(target);

    // Prioritas pengecoh: 1) pos sama & level sama, 2) pos sama, 3) level sama, 4) kata lain
    const samePosAndCefr = pool.filter(
      (w) => w.id !== target.id && w.pos === target.pos && w.cefr === target.cefr,
    );
    const samePos = pool.filter((w) => w.id !== target.id && w.pos === target.pos);
    const sameCefr = pool.filter((w) => w.id !== target.id && w.cefr === target.cefr);
    const anyOther = pool.filter((w) => w.id !== target.id);

    const distractorSet = new Set<string>();
    for (const group of [samePosAndCefr, samePos, sameCefr, anyOther]) {
      for (const candidate of shuffleArray(group)) {
        const val = valueOf(candidate);
        if (val !== correctAnswer) {
          distractorSet.add(val);
        }
        if (distractorSet.size >= 3) break;
      }
      if (distractorSet.size >= 3) break;
    }

    const options = shuffleArray([correctAnswer, ...Array.from(distractorSet).slice(0, 3)]);

    return {
      wordId: target.id,
      no: target.no,
      direction,
      prompt: direction === "en_to_id" ? target.word : target.meaning_id,
      pos: target.pos,
      cefr: target.cefr,
      exampleEn: target.example_en,
      exampleId: target.example_id,
      options,
      correctAnswer,
    };
  });
}
