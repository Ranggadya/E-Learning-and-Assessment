import assert from "node:assert/strict";
import test from "node:test";
import type { PersonalityConfig } from "@/types/assessment";
import { countSubtestItems, resolveSubtestDuration, scorePersonality } from "./scoring";

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
