import { unstable_cache } from "next/cache";
import { databasePool } from "@/lib/db/pool";
import type {
  CefrLevel,
  EnglishLevelSummary,
  EnglishProgressOverview,
  EnglishQuizQuestion,
  EnglishWord,
  EnglishWordInput,
} from "@/types/english";
import { CEFR_LEVELS, DEFAULT_ENGLISH_POS_LIST, ENGLISH_CACHE_TAG } from "./constants";
import {
  buildQuizQuestionsFromPool,
  isCefrLevel,
  isUndefinedTableError,
  isValidAnonUserId,
  normalizeKamusParams,
  queryEnglishDictionaryRows,
} from "./logic";

export async function ensureEnglishSchema(): Promise<void> {
  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS english_words (
      id          SERIAL PRIMARY KEY,
      no          INTEGER NOT NULL UNIQUE,
      word        TEXT NOT NULL,
      pos         TEXT NOT NULL,
      meaning_id  TEXT NOT NULL,
      example_en  TEXT NOT NULL,
      example_id  TEXT NOT NULL,
      cefr        TEXT NOT NULL CHECK (cefr IN ('A1', 'A2', 'B1', 'B2', 'C1')),
      topic       TEXT NOT NULL DEFAULT 'kamus'
    );
    CREATE INDEX IF NOT EXISTS english_words_cefr_pos_idx ON english_words (cefr, pos);
    CREATE INDEX IF NOT EXISTS english_words_lower_word_idx ON english_words (LOWER(word), no);
    CREATE TABLE IF NOT EXISTS english_progress (
      user_id        TEXT NOT NULL,
      word_id        INTEGER NOT NULL REFERENCES english_words(id) ON DELETE CASCADE,
      box            INTEGER NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
      next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      correct_count  INTEGER NOT NULL DEFAULT 0,
      wrong_count    INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, word_id)
    );
    CREATE INDEX IF NOT EXISTS english_progress_user_review_idx ON english_progress (user_id, next_review_at);
  `);
}

export async function upsertEnglishWords(
  words: EnglishWordInput[],
): Promise<{ upsertedCount: number }> {
  if (words.length === 0) {
    return { upsertedCount: 0 };
  }
  await ensureEnglishSchema();

  const nos = words.map((w) => w.no);
  const wordList = words.map((w) => w.word);
  const posList = words.map((w) => w.pos);
  const meaningList = words.map((w) => w.meaning_id);
  const exampleEnList = words.map((w) => w.example_en);
  const exampleIdList = words.map((w) => w.example_id);
  const cefrList = words.map((w) => w.cefr);

  const result = await databasePool.query(
    `
    INSERT INTO english_words (no, word, pos, meaning_id, example_en, example_id, cefr)
    SELECT * FROM UNNEST(
      $1::int[],
      $2::text[],
      $3::text[],
      $4::text[],
      $5::text[],
      $6::text[],
      $7::text[]
    )
    ON CONFLICT (no) DO UPDATE SET
      word       = EXCLUDED.word,
      pos        = EXCLUDED.pos,
      meaning_id = EXCLUDED.meaning_id,
      example_en = EXCLUDED.example_en,
      example_id = EXCLUDED.example_id,
      cefr       = EXCLUDED.cefr
    `,
    [nos, wordList, posList, meaningList, exampleEnList, exampleIdList, cefrList],
  );

  return { upsertedCount: result.rowCount ?? words.length };
}

const getCachedDistinctPosList = unstable_cache(
  async function queryDistinctPosList(): Promise<string[]> {
    try {
      const posRes = await databasePool.query<{ pos: string }>(
        `SELECT DISTINCT pos FROM english_words ORDER BY pos ASC`,
      );
      return posRes.rows.map((r) => r.pos);
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return [];
      }
      throw error;
    }
  },
  ["english:distinct-pos"],
  { tags: [ENGLISH_CACHE_TAG], revalidate: 86400 },
);

const getCachedEnglishWordTotalsByLevel = unstable_cache(
  async function queryWordTotalsByLevel(): Promise<Record<CefrLevel, number>> {
    const totals: Record<CefrLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
    try {
      const res = await databasePool.query<{ cefr: CefrLevel; total: string }>(
        `SELECT cefr, COUNT(*)::text AS total FROM english_words GROUP BY cefr`,
      );
      for (const row of res.rows) {
        if (isCefrLevel(row.cefr)) {
          totals[row.cefr] = Number(row.total);
        }
      }
      return totals;
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return totals;
      }
      throw error;
    }
  },
  ["english:word-totals-by-level"],
  { tags: [ENGLISH_CACHE_TAG], revalidate: 3600 },
);

const getCachedWordsPool = unstable_cache(
  async function queryWordsPool(filterCefr: CefrLevel | null): Promise<EnglishWord[]> {
    try {
      const res = await databasePool.query<EnglishWord>(
        `
        SELECT id, no, word, pos, meaning_id, example_en, example_id, cefr
        FROM english_words
        WHERE ($1::text IS NULL OR cefr = $1)
        ORDER BY no ASC
        `,
        [filterCefr],
      );
      return res.rows;
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return [];
      }
      throw error;
    }
  },
  ["english:words-pool"],
  { tags: [ENGLISH_CACHE_TAG], revalidate: 3600 },
);

const getCachedEnglishDictionary = unstable_cache(
  async function runCachedDictionaryQuery(
    cefr: string,
    pos: string,
    q: string,
    requestedPage: number,
    pageSize: number,
  ) {
    return queryEnglishDictionaryRows(
      { cefr, pos, q, requestedPage, pageSize },
      <T>(text: string, values?: unknown[]) =>
        databasePool.query<T & Record<string, unknown>>(text, values),
    );
  },
  ["english:dictionary-page:alpha:v2"],
  { tags: [ENGLISH_CACHE_TAG], revalidate: 3600 },
);

export async function queryEnglishDictionary(params: {
  cefr?: string;
  pos?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: EnglishWord[];
  total: number;
  page: number;
  pageSize: number;
  posList: string[];
}> {
  const normalized = normalizeKamusParams(params);
  const result = await getCachedEnglishDictionary(
    normalized.cefr,
    normalized.pos,
    normalized.q,
    normalized.page,
    normalized.pageSize,
  );
  // shortcut: memakai daftar POS standar saat total > 0 agar cold cache hanya 1 query DB; panggil getCachedDistinctPosList() selalu jika admin mengimpor POS kustom baru
  const posList =
    result.total > 0
      ? [...DEFAULT_ENGLISH_POS_LIST]
      : await getCachedDistinctPosList();
  return { ...result, posList };
}

export async function getEnglishProgressOverview(
  userId: string | null,
): Promise<EnglishProgressOverview> {
  const emptyLevels: EnglishLevelSummary[] = CEFR_LEVELS.map((cefr) => ({
    cefr,
    total: 0,
    learned: 0,
    percent: 0,
  }));

  try {
    const validUser = isValidAnonUserId(userId) ? userId : null;
    const totalsByLevel = await getCachedEnglishWordTotalsByLevel();

    if (!validUser) {
      const byLevel = CEFR_LEVELS.map((cefr) => ({
        cefr,
        total: totalsByLevel[cefr] ?? 0,
        learned: 0,
        percent: 0,
      }));
      const totalWords = byLevel.reduce((acc, item) => acc + item.total, 0);
      return {
        totalWords,
        learnedWords: 0,
        byLevel,
      };
    }

    const levelRes = await databasePool.query<{
      cefr: CefrLevel;
      learned: string;
    }>(
      `
      SELECT
        w.cefr,
        COUNT(*)::text AS learned
      FROM english_progress p
      JOIN english_words w ON w.id = p.word_id
      WHERE p.user_id = $1
      GROUP BY w.cefr
      `,
      [validUser],
    );

    const learnedByCefr = new Map<CefrLevel, number>();
    for (const row of levelRes.rows) {
      learnedByCefr.set(row.cefr, Number(row.learned));
    }

    let totalWords = 0;
    let learnedWords = 0;
    const byLevel: EnglishLevelSummary[] = CEFR_LEVELS.map((cefr) => {
      const total = totalsByLevel[cefr] ?? 0;
      const learned = learnedByCefr.get(cefr) ?? 0;
      totalWords += total;
      learnedWords += learned;
      return {
        cefr,
        total,
        learned,
        percent: total > 0 ? Math.round((learned / total) * 100) : 0,
      };
    });

    return {
      totalWords,
      learnedWords,
      byLevel,
    };
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return {
        totalWords: 0,
        learnedWords: 0,
        byLevel: emptyLevels,
      };
    }
    throw error;
  }
}

export async function recordEnglishQuizProgress(
  userId: string,
  results: Array<{ wordId: number; known: boolean }>,
): Promise<{ updatedCount: number }> {
  if (results.length === 0) {
    return { updatedCount: 0 };
  }

  const wordIds = results.map((r) => r.wordId);
  const knownFlags = results.map((r) => r.known);

  try {
    const res = await databasePool.query(
      `
      INSERT INTO english_progress (user_id, word_id, box, next_review_at, correct_count, wrong_count)
      SELECT
        $1,
        w.id,
        CASE WHEN u.known THEN 2 ELSE 1 END,
        now() + (CASE WHEN u.known THEN 2 ELSE 1 END) * INTERVAL '1 day',
        CASE WHEN u.known THEN 1 ELSE 0 END,
        CASE WHEN u.known THEN 0 ELSE 1 END
      FROM UNNEST($2::int[], $3::bool[]) AS u(word_id, known)
      JOIN english_words w ON w.id = u.word_id
      ON CONFLICT (user_id, word_id) DO UPDATE SET
        box            = CASE WHEN EXCLUDED.correct_count = 1 THEN LEAST(5, english_progress.box + 1) ELSE 1 END,
        next_review_at = now() + (
          CASE
            WHEN EXCLUDED.correct_count = 1 THEN (ARRAY[1, 2, 4, 8, 16])[LEAST(5, english_progress.box + 1)]
            ELSE 1
          END
        ) * INTERVAL '1 day',
        correct_count  = english_progress.correct_count + EXCLUDED.correct_count,
        wrong_count    = english_progress.wrong_count + EXCLUDED.wrong_count
      `,
      [userId, wordIds, knownFlags],
    );
    return { updatedCount: res.rowCount ?? 0 };
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return { updatedCount: 0 };
    }
    throw error;
  }
}

export async function generateEnglishQuiz(params: {
  cefr?: string;
  count?: number;
}): Promise<EnglishQuizQuestion[]> {
  const filterCefr = params.cefr && isCefrLevel(params.cefr) ? params.cefr : null;
  const words = await getCachedWordsPool(filterCefr);
  return buildQuizQuestionsFromPool(words, params.count ?? 10);
}
