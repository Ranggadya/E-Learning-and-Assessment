import assert from "node:assert/strict";
import test from "node:test";
import type { EnglishWord } from "@/types/english";
import {
  buildKamusUrl,
  buildQuizQuestionsFromPool,
  computeNextLeitnerState,
  escapeSqlLike,
  isCefrLevel,
  isUndefinedTableError,
  isValidAnonUserId,
  normalizeKamusParams,
  queryEnglishDictionaryRows,
  validateEnglishWordsJson,
  type EnglishQueryExecutor,
} from "./logic";

test("computeNextLeitnerState menaikkan kotak 1..5 dengan jeda 1, 2, 4, 8, 16 hari dan reset ke 1 jika salah", () => {
  const baseDate = new Date("2026-11-23T00:00:00.000Z");

  // Kata baru (null) yang langsung Tahu naik ke kotak 2 (2 hari)
  const fromNewKnown = computeNextLeitnerState(null, true, baseDate);
  assert.equal(fromNewKnown.nextBox, 2);
  assert.equal(fromNewKnown.intervalDays, 2);

  // Kata di kotak 1..4 naik bertahap
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((b) => computeNextLeitnerState(b, true, baseDate)),
    [
      { nextBox: 2, intervalDays: 2, nextReviewAt: new Date("2026-11-25T00:00:00.000Z") },
      { nextBox: 3, intervalDays: 4, nextReviewAt: new Date("2026-11-27T00:00:00.000Z") },
      { nextBox: 4, intervalDays: 8, nextReviewAt: new Date("2026-12-01T00:00:00.000Z") },
      { nextBox: 5, intervalDays: 16, nextReviewAt: new Date("2026-12-09T00:00:00.000Z") },
      { nextBox: 5, intervalDays: 16, nextReviewAt: new Date("2026-12-09T00:00:00.000Z") },
    ],
  );

  // Salah ("Belum") dari kotak mana pun kembali ke kotak 1 (jeda 1 hari)
  const wrongFromBox4 = computeNextLeitnerState(4, false, baseDate);
  assert.equal(wrongFromBox4.nextBox, 1);
  assert.equal(wrongFromBox4.intervalDays, 1);
  assert.equal(wrongFromBox4.nextReviewAt.toISOString(), "2026-11-24T00:00:00.000Z");
});

test("validateEnglishWordsJson menerima data kamus valid dan menolak duplikat no atau CEFR salah", () => {
  const valid = validateEnglishWordsJson([
    {
      no: 1,
      word: "about",
      pos: "preposition",
      meaning_id: "tentang",
      example_en: "This story is about a dog.",
      example_id: "Cerita ini tentang seekor anjing.",
      cefr: "A1",
    },
  ]);
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.words.length, 1);
    assert.equal(valid.words[0].word, "about");
  }

  const invalid = validateEnglishWordsJson([
    {
      no: 1,
      word: "one",
      pos: "noun",
      meaning_id: "satu",
      example_en: "One.",
      example_id: "Satu.",
      cefr: "A1",
    },
    {
      no: 1,
      word: "two",
      pos: "noun",
      meaning_id: "dua",
      example_en: "Two.",
      example_id: "Dua.",
      cefr: "Z9",
    },
  ]);
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.ok(invalid.errors.some((e) => e.includes("duplikat")));
    assert.ok(invalid.errors.some((e) => e.includes("cefr")));
  }
});

test("buildQuizQuestionsFromPool menghasilkan 4 opsi unik dengan pengecoh selevel dan pos sama", () => {
  const pool: EnglishWord[] = [
    { id: 1, no: 1, word: "apple", pos: "noun", meaning_id: "apel", example_en: "E1", example_id: "I1", cefr: "A1" },
    { id: 2, no: 2, word: "book", pos: "noun", meaning_id: "buku", example_en: "E2", example_id: "I2", cefr: "A1" },
    { id: 3, no: 3, word: "cat", pos: "noun", meaning_id: "kucing", example_en: "E3", example_id: "I3", cefr: "A1" },
    { id: 4, no: 4, word: "dog", pos: "noun", meaning_id: "anjing", example_en: "E4", example_id: "I4", cefr: "A1" },
    { id: 5, no: 5, word: "quickly", pos: "adverb", meaning_id: "dengan cepat", example_en: "E5", example_id: "I5", cefr: "B2" },
  ];

  const quiz = buildQuizQuestionsFromPool(pool, 4);
  assert.equal(quiz.length, 4);
  for (const q of quiz) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options.includes(q.correctAnswer));
  }
});

test("buildQuizQuestionsFromPool mengembalikan array kosong jika pool kurang dari 4 kata", () => {
  const smallPool: EnglishWord[] = [
    { id: 1, no: 1, word: "apple", pos: "noun", meaning_id: "apel", example_en: "E1", example_id: "I1", cefr: "A1" },
    { id: 2, no: 2, word: "book", pos: "noun", meaning_id: "buku", example_en: "E2", example_id: "I2", cefr: "A1" },
    { id: 3, no: 3, word: "cat", pos: "noun", meaning_id: "kucing", example_en: "E3", example_id: "I3", cefr: "A1" },
  ];

  assert.deepEqual(buildQuizQuestionsFromPool([]), []);
  assert.deepEqual(buildQuizQuestionsFromPool(smallPool.slice(0, 1)), []);
  assert.deepEqual(buildQuizQuestionsFromPool(smallPool), []);
});

test("isCefrLevel hanya menerima level A1 sampai C1", () => {
  for (const valid of ["A1", "A2", "B1", "B2", "C1"]) {
    assert.equal(isCefrLevel(valid), true);
  }
  for (const invalid of ["C2", "a1", "", "B3", null, undefined, 1]) {
    assert.equal(isCefrLevel(invalid), false);
  }
});

test("isValidAnonUserId memvalidasi panjang 8..64 karakter [a-zA-Z0-9_-]", () => {
  assert.equal(isValidAnonUserId("abcd1234"), true);
  assert.equal(isValidAnonUserId("anon_user-123456"), true);
  assert.equal(isValidAnonUserId("a".repeat(64)), true);

  assert.equal(isValidAnonUserId("short"), false);
  assert.equal(isValidAnonUserId("a".repeat(65)), false);
  assert.equal(isValidAnonUserId("invalid user!"), false);
  assert.equal(isValidAnonUserId("user/1234"), false);
  assert.equal(isValidAnonUserId(null), false);
  assert.equal(isValidAnonUserId(12345678), false);
});

test("normalizeKamusParams dan buildKamusUrl menormalisasi filter, menjepit halaman, dan menyusun query string bersih", () => {
  assert.deepEqual(
    normalizeKamusParams({ cefr: "B2", pos: "  noun ", q: " bank ", page: "3.9", pageSize: 200 }),
    { cefr: "B2", pos: "noun", q: "bank", page: 3, pageSize: 100 },
  );
  assert.deepEqual(
    normalizeKamusParams({ cefr: "INVALID", page: "-5", pageSize: 0 }),
    { cefr: "", pos: "", q: "", page: 1, pageSize: 1 },
  );
  assert.deepEqual(normalizeKamusParams({ page: "abc" }), {
    cefr: "",
    pos: "",
    q: "",
    page: 1,
    pageSize: 50,
  });

  assert.equal(buildKamusUrl({}), "/materi/kamus");
  assert.equal(buildKamusUrl({ page: 1 }), "/materi/kamus");
  assert.equal(
    buildKamusUrl({ cefr: "A2", pos: "verb", q: "run", page: 2 }),
    "/materi/kamus?cefr=A2&pos=verb&q=run&page=2",
  );
});

test("escapeSqlLike meng-escape karakter wildcard %, _, dan backslash", () => {
  assert.equal(escapeSqlLike("100%"), "100\\%");
  assert.equal(escapeSqlLike("part_time\\test"), "part\\_time\\\\test");
});

test("queryEnglishDictionaryRows menyusun ORDER BY LOWER(word) ASC, meng-escape wildcard, menjepit halaman berlebih, dan aman saat 42P01", async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const sampleRow = {
    id: 7,
    no: 901,
    word: "economy",
    pos: "noun",
    meaning_id: "ekonomi",
    example_en: "The economy is growing.",
    example_id: "Ekonominya bertumbuh.",
    cefr: "B2" as const,
    total_count: "1",
  };

  const hitExecutor: EnglishQueryExecutor = async <T>(text: string, values?: unknown[]) => {
    calls.push({ text, values });
    return { rows: [sampleRow as unknown as T] };
  };

  const firstPage = await queryEnglishDictionaryRows(
    { cefr: "B2", pos: "noun", q: "50%_growth", requestedPage: 1, pageSize: 50 },
    hitExecutor,
  );

  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /ORDER BY LOWER\(word\) ASC, no ASC/);
  assert.deepEqual(calls[0].values, ["B2", "noun", "%50\\%\\_growth%", 50, 0]);
  assert.equal(firstPage.total, 1);
  assert.equal(firstPage.page, 1);
  assert.equal(firstPage.items[0]?.word, "economy");

  // Simulasi ?page=999 melampaui total 65 kata -> dijepit ke halaman 2 (offset 50)
  const clampCalls: Array<{ text: string; values?: unknown[] }> = [];
  const clampExecutor: EnglishQueryExecutor = async <T>(text: string, values?: unknown[]) => {
    clampCalls.push({ text, values });
    if (clampCalls.length === 1) {
      return { rows: [] };
    }
    if (clampCalls.length === 2) {
      return { rows: [{ total: "65" } as unknown as T] };
    }
    return {
      rows: [
        {
          id: 8,
          no: 950,
          word: "zeal",
          pos: "noun",
          meaning_id: "semangat",
          example_en: "Great zeal.",
          example_id: "Semangat besar.",
          cefr: "C1",
        } as unknown as T,
      ],
    };
  };

  const clamped = await queryEnglishDictionaryRows(
    { cefr: "", pos: "", q: "", requestedPage: 999, pageSize: 50 },
    clampExecutor,
  );
  assert.equal(clampCalls.length, 3);
  assert.equal(clamped.page, 2);
  assert.equal(clamped.total, 65);
  assert.deepEqual(clampCalls[2].values, [50, 50]);

  // Fail-safe saat tabel belum dimigrasi (PostgreSQL 42P01)
  const missingTableExecutor: EnglishQueryExecutor = async () => {
    const err = new Error("relation does not exist") as Error & { code: string };
    err.code = "42P01";
    throw err;
  };
  assert.equal(isUndefinedTableError({ code: "42P01" }), true);
  const emptyFallback = await queryEnglishDictionaryRows(
    { cefr: "A1", pos: "", q: "", requestedPage: 2, pageSize: 50 },
    missingTableExecutor,
  );
  assert.deepEqual(emptyFallback, { items: [], total: 0, page: 1, pageSize: 50 });
});
