import assert from "node:assert/strict";
import test from "node:test";
import type { PersonalityConfig } from "@/types/assessment";
import { parsePgInt4Id } from "@/lib/format";
import {
  checkAttemptRateLimit,
  countSubtestItems,
  isValidNonQuizPayload,
  isValidQuizPayload,
  resetAttemptRateLimitForTest,
  resolveSubtestDuration,
  scoreDrawing,
  scorePauli,
  scorePersonality,
  scoreQuizAnswers,
} from "./scoring";

const SAMPLE_CONFIG: PersonalityConfig = {
  traits: [
    {
      key: "ketelitian",
      name: "Ketelitian",
      description: "Kerapian kerja",
      highMeaning: "Tinggi",
      lowMeaning: "Rendah",
    },
  ],
  statements: [
    { text: "Saya rapi", trait: "ketelitian" },
    { text: "Saya ceroboh", trait: "ketelitian", reverse: true },
  ],
};

test("scorePersonality menormalisasi skala 1..5 ke 0..100% dan membalik pernyataan reverse", () => {
  const minRes = scorePersonality(SAMPLE_CONFIG, [1, 5]);
  assert.equal(minRes.traits[0].percent, 0);
  assert.equal(minRes.traits[0].level, "Rendah");

  const midRes = scorePersonality(SAMPLE_CONFIG, [3, 3]);
  assert.equal(midRes.traits[0].percent, 50);
  assert.equal(midRes.traits[0].level, "Sedang");

  const maxRes = scorePersonality(SAMPLE_CONFIG, [5, 1]);
  assert.equal(maxRes.traits[0].percent, 100);
  assert.equal(maxRes.traits[0].level, "Tinggi");
});

test("scorePersonality menandai trait yang belum dijawab sebagai Belum dijawab", () => {
  const emptyRes = scorePersonality(SAMPLE_CONFIG, [null, null]);
  assert.equal(emptyRes.answered, 0);
  assert.equal(emptyRes.traits[0].level, "Belum dijawab");
});

test("countSubtestItems menghitung jumlah item untuk QUIZ, PERSONALITY, PAULI, dan DRAWING", () => {
  assert.equal(countSubtestItems("QUIZ", 25, { statements: ["x"] }), 25);
  assert.equal(countSubtestItems("PERSONALITY", 0, SAMPLE_CONFIG), 2);
  assert.equal(countSubtestItems("PERSONALITY", 12, null), 12);
  assert.equal(countSubtestItems("PAULI", 0, { columns: 15, digitsPerColumn: 40, secondsPerColumn: 30 }), 15);
  assert.equal(countSubtestItems("PAULI", 5, {}), 5);
  assert.equal(
    countSubtestItems("DRAWING", 0, {
      tasks: [
        { key: "t1", title: "Orang", instruction: "Gambar orang", seconds: 300 },
        { key: "t2", title: "Pohon", instruction: "Gambar pohon", seconds: 300 },
        { key: "t3", title: "Rumah", instruction: "Gambar rumah", seconds: 300 },
      ],
    }),
    3,
  );
  assert.equal(countSubtestItems("DRAWING", 4, null), 4);
});

test("resolveSubtestDuration mengutamakan durationSeconds positif dan menghitung fallback per jenis", () => {
  assert.equal(resolveSubtestDuration("QUIZ", 600, null), 600);
  assert.equal(resolveSubtestDuration("PERSONALITY", 450, SAMPLE_CONFIG), 450);
  assert.equal(
    resolveSubtestDuration("PAULI", 900, { columns: 10, secondsPerColumn: 30 }),
    900,
  );
  assert.equal(
    resolveSubtestDuration("DRAWING", 500, { tasks: [{ seconds: 120 }, { seconds: 180 }] }),
    500,
  );

  // Fallback saat durationSeconds 0 atau undefined
  assert.equal(resolveSubtestDuration("QUIZ", 0, null), 0);
  assert.equal(resolveSubtestDuration("QUIZ", undefined, {}), 0);
  assert.equal(resolveSubtestDuration("PERSONALITY", undefined, SAMPLE_CONFIG), 0);
  assert.equal(
    resolveSubtestDuration("PAULI", 0, { columns: 12, secondsPerColumn: 45 }),
    540,
  );
  assert.equal(resolveSubtestDuration("PAULI", undefined, {}), 300);
  assert.equal(
    resolveSubtestDuration("DRAWING", 0, { tasks: [{ seconds: 180 }, { seconds: 240 }] }),
    420,
  );
  assert.equal(resolveSubtestDuration("DRAWING", undefined, {}), 300);
  assert.equal(resolveSubtestDuration("DRAWING", 0, null), 0);
});

test("parsePgInt4Id menerima angka & string 1..2147483647 dan menolak 0, negatif, atau overflow INT4", () => {
  assert.equal(parsePgInt4Id(1), 1);
  assert.equal(parsePgInt4Id("42"), 42);
  assert.equal(parsePgInt4Id(2_147_483_647), 2_147_483_647);
  assert.equal(parsePgInt4Id(0), null);
  assert.equal(parsePgInt4Id(""), null);
  assert.equal(parsePgInt4Id("   "), null);
  assert.equal(parsePgInt4Id(-3), null);
  assert.equal(parsePgInt4Id(2_147_483_648), null);
  assert.equal(parsePgInt4Id("9999999999"), null);
  assert.equal(parsePgInt4Id(true), null);
});

test("scoreQuizAnswers, scorePauli, dan scoreDrawing menilai jawaban, menjepit batas, dan mengabaikan ID asing", () => {
  const quiz = scoreQuizAnswers(
    [
      { id: 10, correct_option: "B" },
      { id: 11, correct_option: "D" },
      { id: 12, correct_option: "A" },
    ],
    [
      { questionId: 10, selectedOption: "B" },
      { questionId: 11, selectedOption: "C" },
      { questionId: 999, selectedOption: "A" },
    ],
  );
  assert.equal(quiz.score, 1);
  assert.equal(quiz.totalQuestions, 3);
  assert.deepEqual(quiz.selectedOptions, ["B", "C", null]);
  assert.deepEqual(quiz.isCorrectFlags, [true, false, false]);

  const pauli = scorePauli(
    { columns: 2, digitsPerColumn: 11, secondsPerColumn: 30 },
    [
      { column: 99, answered: 50, correct: 60 },
      { column: 2, answered: 8, correct: 6 },
      { column: 3, answered: 10, correct: 10 },
    ],
  );
  assert.equal(pauli.result.perColumn.length, 2);
  assert.deepEqual(pauli.result.perColumn[0], { column: 1, answered: 10, correct: 10 });
  assert.equal(pauli.totalQuestions, 18);
  assert.equal(pauli.score, 16);
  assert.equal(pauli.result.accuracy, 89);

  const drawing = scoreDrawing(
    {
      tasks: [
        { key: "pohon", title: "Pohon", instruction: "Gambar pohon", seconds: 120 },
        { key: "orang", title: "Orang", instruction: "Gambar orang", seconds: 120 },
      ],
      reflection: ["Apakah proporsional?"],
    },
    [
      { key: "pohon", title: "Pohon", instruction: "Gambar pohon", dataUrl: "data:image/png;base64,AAAA" },
      { key: "orang", title: "Orang", instruction: "Gambar orang", dataUrl: "" },
      { key: "ekstra", title: "Ekstra", instruction: "Diabaikan", dataUrl: "data:image/png;base64,BBBB" },
    ],
  );
  assert.equal(drawing.score, 1);
  assert.equal(drawing.totalQuestions, 2);
  assert.equal(drawing.result.drawings.length, 2);
});

test("isValidQuizPayload, isValidNonQuizPayload, dan checkAttemptRateLimit membatasi ukuran, ID INT4, dan spam IP", () => {
  assert.equal(isValidQuizPayload({ subtestId: 1, answers: [{ questionId: 2, selectedOption: "A" }] }), true);
  assert.equal(isValidQuizPayload({ subtestId: 0, answers: [] }), false);
  assert.equal(isValidQuizPayload({ subtestId: 9_999_999_999, answers: [] }), false);
  assert.equal(
    isValidQuizPayload({ subtestId: 1, answers: [{ questionId: 2, selectedOption: "X".repeat(20) }] }),
    false,
  );
  assert.equal(
    isValidQuizPayload({
      subtestId: 1,
      answers: Array.from({ length: 201 }, (_, i) => ({ questionId: i + 1, selectedOption: null })),
    }),
    false,
  );

  assert.equal(isValidNonQuizPayload({ subtestId: 5, kind: "PERSONALITY", ratings: [1, null, 5] }), true);
  assert.equal(
    isValidNonQuizPayload({ subtestId: 5, kind: "PERSONALITY", ratings: new Array(301).fill(3) }),
    false,
  );
  assert.equal(
    isValidNonQuizPayload({
      subtestId: 5,
      kind: "DRAWING",
      drawings: [{ key: "k", title: "t", instruction: "i", dataUrl: "data:text/html,evil" }],
    }),
    false,
  );

  resetAttemptRateLimitForTest();
  const baseNow = 1_000_000;
  for (let i = 0; i < 30; i += 1) {
    assert.equal(checkAttemptRateLimit("203.0.113.10", baseNow + i).allowed, true);
  }
  const blocked = checkAttemptRateLimit("203.0.113.10", baseNow + 500);
  assert.equal(blocked.allowed, false);
  assert.equal(checkAttemptRateLimit("203.0.113.10", baseNow + 60_001).allowed, true);
  resetAttemptRateLimitForTest();
});
