import { databasePool } from "@/lib/db/pool";
import type {
  CefrLevel,
  EnglishLevelSummary,
  EnglishProgressOverview,
  EnglishQuizQuestion,
  EnglishWord,
  EnglishWordInput,
  EnglishWordWithProgress,
} from "@/types/english";
import { CEFR_LEVELS } from "./constants";
import {
  buildQuizQuestionsFromPool,
  computeNextLeitnerState,
  isCefrLevel,
  isValidAnonUserId,
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
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const requestedPage = Math.max(1, params.page ?? 1);

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.cefr && isCefrLevel(params.cefr)) {
    values.push(params.cefr);
    conditions.push(`cefr = $${values.length}`);
  }
  if (params.pos && params.pos.trim() !== "") {
    values.push(params.pos.trim());
    conditions.push(`pos = $${values.length}`);
  }
  if (params.q && params.q.trim() !== "") {
    values.push(`%${params.q.trim()}%`);
    conditions.push(`(word ILIKE $${values.length} OR meaning_id ILIKE $${values.length})`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [countRes, posRes] = await Promise.all([
      databasePool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM english_words ${whereSql}`,
        values,
      ),
      databasePool.query<{ pos: string }>(
        `SELECT DISTINCT pos FROM english_words ORDER BY pos ASC`,
      ),
    ]);

    const total = Number(countRes.rows[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const listValues = [...values, pageSize, offset];
    const itemsRes = await databasePool.query<EnglishWord>(
      `
      SELECT id, no, word, pos, meaning_id, example_en, example_id, cefr
      FROM english_words
      ${whereSql}
      ORDER BY no ASC
      LIMIT $${listValues.length - 1} OFFSET $${listValues.length}
      `,
      listValues,
    );

    return {
      items: itemsRes.rows,
      total,
      page,
      pageSize,
      posList: posRes.rows.map((r) => r.pos),
    };
  } catch (error) {
    // Fail-safe jika tabel belum dimigrasi (42P01)
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "42P01"
    ) {
      return { items: [], total: 0, page: 1, pageSize, posList: [] };
    }
    throw error;
  }
}

export async function getEnglishProgressOverview(
  userId: string | null,
): Promise<EnglishProgressOverview> {
  const emptyBoxes: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const emptyLevels: EnglishLevelSummary[] = CEFR_LEVELS.map((cefr) => ({
    cefr,
    total: 0,
    learned: 0,
    mastered: 0,
    percent: 0,
  }));

  try {
    const validUser = isValidAnonUserId(userId) ? userId : null;
    const levelRes = await databasePool.query<{
      cefr: CefrLevel;
      total: string;
      learned: string;
      mastered: string;
    }>(
      validUser
        ? `
          SELECT
            w.cefr,
            COUNT(*)::text AS total,
            COUNT(p.word_id)::text AS learned,
            COUNT(*) FILTER (WHERE p.box >= 4)::text AS mastered
          FROM english_words w
          LEFT JOIN english_progress p
            ON p.word_id = w.id AND p.user_id = $1
          GROUP BY w.cefr
          `
        : `
          SELECT
            w.cefr,
            COUNT(*)::text AS total,
            '0' AS learned,
            '0' AS mastered
          FROM english_words w
          GROUP BY w.cefr
          `,
      validUser ? [validUser] : [],
    );

    const byLevelMap = new Map<CefrLevel, EnglishLevelSummary>();
    let totalWords = 0;
    let learnedWords = 0;

    for (const row of levelRes.rows) {
      const total = Number(row.total);
      const learned = Number(row.learned);
      const mastered = Number(row.mastered);
      totalWords += total;
      learnedWords += learned;
      byLevelMap.set(row.cefr, {
        cefr: row.cefr,
        total,
        learned,
        mastered,
        percent: total > 0 ? Math.round((learned / total) * 100) : 0,
      });
    }

    const byLevel = CEFR_LEVELS.map(
      (cefr) =>
        byLevelMap.get(cefr) ?? {
          cefr,
          total: 0,
          learned: 0,
          mastered: 0,
          percent: 0,
        },
    );

    let dueCount = 0;
    if (validUser) {
      const boxRes = await databasePool.query<{
        box: number;
        cnt: string;
        due_cnt: string;
      }>(
        `
        SELECT
          box,
          COUNT(*)::text AS cnt,
          COUNT(*) FILTER (WHERE next_review_at <= now())::text AS due_cnt
        FROM english_progress
        WHERE user_id = $1
        GROUP BY box
        `,
        [validUser],
      );

      for (const row of boxRes.rows) {
        if (row.box >= 1 && row.box <= 5) {
          emptyBoxes[row.box as 1 | 2 | 3 | 4 | 5] = Number(row.cnt);
        }
        dueCount += Number(row.due_cnt);
      }
    }

    return {
      totalWords,
      learnedWords,
      dueCount,
      boxCounts: emptyBoxes,
      unseenCount: Math.max(0, totalWords - learnedWords),
      byLevel,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "42P01"
    ) {
      return {
        totalWords: 0,
        learnedWords: 0,
        dueCount: 0,
        boxCounts: emptyBoxes,
        unseenCount: 0,
        byLevel: emptyLevels,
      };
    }
    throw error;
  }
}

export async function getStudyQueue(params: {
  userId: string;
  cefr?: string;
  newLimit?: number;
}): Promise<{ dueWords: EnglishWordWithProgress[]; newWords: EnglishWordWithProgress[] }> {
  const newLimit = Math.min(50, Math.max(1, params.newLimit ?? 10));
  const filterCefr = params.cefr && isCefrLevel(params.cefr) ? params.cefr : null;

  const dueRes = await databasePool.query<EnglishWordWithProgress>(
    `
    SELECT
      w.id, w.no, w.word, w.pos, w.meaning_id, w.example_en, w.example_id, w.cefr,
      p.box, p.next_review_at::text AS next_review_at, p.correct_count, p.wrong_count
    FROM english_progress p
    JOIN english_words w ON w.id = p.word_id
    WHERE p.user_id = $1
      AND p.next_review_at <= now()
      AND ($2::text IS NULL OR w.cefr = $2)
    ORDER BY p.next_review_at ASC, w.no ASC
    LIMIT 100
    `,
    [params.userId, filterCefr],
  );

  const newRes = await databasePool.query<EnglishWordWithProgress>(
    `
    SELECT
      w.id, w.no, w.word, w.pos, w.meaning_id, w.example_en, w.example_id, w.cefr,
      NULL::int AS box, NULL::text AS next_review_at, 0 AS correct_count, 0 AS wrong_count
    FROM english_words w
    LEFT JOIN english_progress p ON p.word_id = w.id AND p.user_id = $1
    WHERE p.word_id IS NULL
      AND ($2::text IS NULL OR w.cefr = $2)
    ORDER BY w.no ASC
    LIMIT $3
    `,
    [params.userId, filterCefr, newLimit],
  );

  return {
    dueWords: dueRes.rows,
    newWords: newRes.rows,
  };
}

export async function recordFlashcardReview(params: {
  userId: string;
  wordId: number;
  known: boolean;
}): Promise<{ box: number; intervalDays: number; nextReviewAt: string }> {
  const existingRes = await databasePool.query<{ box: number }>(
    `SELECT box FROM english_progress WHERE user_id = $1 AND word_id = $2`,
    [params.userId, params.wordId],
  );
  const currentBox = existingRes.rows[0]?.box ?? null;
  const { nextBox, intervalDays, nextReviewAt } = computeNextLeitnerState(
    currentBox,
    params.known,
  );

  await databasePool.query(
    `
    INSERT INTO english_progress (user_id, word_id, box, next_review_at, correct_count, wrong_count)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, word_id) DO UPDATE SET
      box            = $3,
      next_review_at = $4,
      correct_count  = english_progress.correct_count + $5,
      wrong_count    = english_progress.wrong_count + $6
    `,
    [
      params.userId,
      params.wordId,
      nextBox,
      nextReviewAt.toISOString(),
      params.known ? 1 : 0,
      params.known ? 0 : 1,
    ],
  );

  return {
    box: nextBox,
    intervalDays,
    nextReviewAt: nextReviewAt.toISOString(),
  };
}

export async function generateEnglishQuiz(params: {
  cefr?: string;
  count?: number;
}): Promise<EnglishQuizQuestion[]> {
  const filterCefr = params.cefr && isCefrLevel(params.cefr) ? params.cefr : null;
  const res = await databasePool.query<EnglishWord>(
    `
    SELECT id, no, word, pos, meaning_id, example_en, example_id, cefr
    FROM english_words
    WHERE ($1::text IS NULL OR cefr = $1)
    `,
    [filterCefr],
  );
  return buildQuizQuestionsFromPool(res.rows, params.count ?? 10);
}
