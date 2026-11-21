import assert from "node:assert/strict";
import test from "node:test";
import { validatePack } from "./pack-schema";
import { scorePersonality, type PersonalityConfig } from "./types";

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

test("validatePack menolak SVG dengan entity/link dan Pauli dengan digitsPerColumn < 2", () => {
  const badSvg = validatePack({
    company: { slug: "c", name: "C" },
    package: { slug: "p", name: "P" },
    subtests: [
      {
        slug: "s",
        name: "S",
        durationSeconds: 60,
        questions: [
          {
            type: "IMAGE",
            prompt: "Q",
            imageSvg: '<svg><a href="javascript&#58;alert(1)">x</a></svg>',
            options: ["A", "B"],
            correctIndex: 0,
            explanation: "E",
          },
        ],
      },
    ],
  });
  assert.equal(badSvg.ok, false);

  const badPauli = validatePack({
    company: { slug: "c", name: "C" },
    package: { slug: "p", name: "P" },
    subtests: [
      {
        slug: "pauli",
        name: "Pauli",
        kind: "PAULI",
        config: { columns: 5, digitsPerColumn: 1, secondsPerColumn: 30 },
      },
    ],
  });
  assert.equal(badPauli.ok, false);
});
