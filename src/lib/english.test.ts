import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQuizQuestionsFromPool,
  computeNextLeitnerState,
  validateEnglishWordsJson,
  type EnglishWord,
} from "./english";

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
