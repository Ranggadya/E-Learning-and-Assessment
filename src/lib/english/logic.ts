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

export function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "42P01"
  );
}

export function escapeSqlLike(input: string): string {
  return input.replace(/[\\%_]/g, "\\$&");
}

export function normalizeKamusParams(raw: {
  cefr?: string;
  pos?: string;
  q?: string;
  page?: string | number;
  pageSize?: number;
}): {
  cefr: CefrLevel | "";
  pos: string;
  q: string;
  page: number;
  pageSize: number;
} {
  const cefr = raw.cefr && isCefrLevel(raw.cefr) ? raw.cefr : "";
  const pos = raw.pos?.trim() ?? "";
  const q = raw.q?.trim() ?? "";
  const parsedPage = Number(raw.page ?? 1);
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1;
  const parsedSize = Number(raw.pageSize ?? 50);
  const pageSize = Number.isFinite(parsedSize)
    ? Math.min(100, Math.max(1, Math.trunc(parsedSize)))
    : 50;
  return { cefr, pos, q, page, pageSize };
}

export function buildKamusUrl(params: {
  cefr?: string;
  pos?: string;
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.cefr) sp.set("cefr", params.cefr);
  if (params.pos) sp.set("pos", params.pos);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return `/materi/kamus${qs ? `?${qs}` : ""}`;
}

export type EnglishQueryExecutor = <T>(
  text: string,
  values?: unknown[],
) => Promise<{ rows: T[] }>;

export async function queryEnglishDictionaryRows(
  params: {
    cefr: string;
    pos: string;
    q: string;
    requestedPage: number;
    pageSize: number;
  },
  queryFn: EnglishQueryExecutor,
): Promise<{
  items: EnglishWord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { cefr, pos, q, requestedPage, pageSize } = params;
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (cefr && isCefrLevel(cefr)) {
    values.push(cefr);
    conditions.push(`cefr = $${values.length}`);
  }
  if (pos) {
    values.push(pos);
    conditions.push(`pos = $${values.length}`);
  }
  if (q) {
    values.push(`%${escapeSqlLike(q)}%`);
    conditions.push(
      `(word ILIKE $${values.length} ESCAPE '\\' OR meaning_id ILIKE $${values.length} ESCAPE '\\')`,
    );
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (requestedPage - 1) * pageSize;
  const listValues = [...values, pageSize, offset];

  type WordWithTotal = EnglishWord & { total_count: string };

  try {
    const itemsRes = await queryFn<WordWithTotal>(
      `
      SELECT id, no, word, pos, meaning_id, example_en, example_id, cefr,
             COUNT(*) OVER()::text AS total_count
      FROM english_words
      ${whereSql}
      ORDER BY LOWER(word) ASC, no ASC
      LIMIT $${listValues.length - 1} OFFSET $${listValues.length}
      `,
      listValues,
    );

    if (itemsRes.rows.length > 0) {
      const total = Number(itemsRes.rows[0].total_count);
      const items: EnglishWord[] = itemsRes.rows.map((row) => ({
        id: row.id,
        no: row.no,
        word: row.word,
        pos: row.pos,
        meaning_id: row.meaning_id,
        example_en: row.example_en,
        example_id: row.example_id,
        cefr: row.cefr,
      }));
      return { items, total, page: requestedPage, pageSize };
    }

    if (requestedPage === 1) {
      return { items: [], total: 0, page: 1, pageSize };
    }

    // Clamp ke halaman terakhir yang valid bila ?page melampaui total halaman hasil filter.
    const countRes = await queryFn<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM english_words ${whereSql}`,
      values,
    );
    const total = Number(countRes.rows[0]?.total ?? 0);
    if (total === 0) {
      return { items: [], total: 0, page: 1, pageSize };
    }

    const clampedPage = Math.max(1, Math.ceil(total / pageSize));
    const clampedOffset = (clampedPage - 1) * pageSize;
    const clampedValues = [...values, pageSize, clampedOffset];
    const clampedRes = await queryFn<EnglishWord>(
      `
      SELECT id, no, word, pos, meaning_id, example_en, example_id, cefr
      FROM english_words
      ${whereSql}
      ORDER BY LOWER(word) ASC, no ASC
      LIMIT $${clampedValues.length - 1} OFFSET $${clampedValues.length}
      `,
      clampedValues,
    );
    return { items: clampedRes.rows, total, page: clampedPage, pageSize };
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return { items: [], total: 0, page: 1, pageSize };
    }
    throw error;
  }
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
