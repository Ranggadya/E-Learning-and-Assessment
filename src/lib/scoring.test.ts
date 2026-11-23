import assert from "node:assert/strict";
import test from "node:test";
import { validatePack } from "./pack-schema";

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
