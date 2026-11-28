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

  for (const unsafeSvg of [
    '<svg/onload=alert(1)></svg>',
    '<svg><rect fill="red"onclick="alert(1)"/></svg>',
    '<svg><set attributeName="onload" to="alert(1)"/></svg>',
    '<svg><animate attributeName="href" values="x"/></svg>',
    '<svg><image href="data:image/svg+xml;base64,PHN2Zz4="/></svg>',
  ]) {
    const res = validatePack({
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
              imageSvg: unsafeSvg,
              options: ["A", "B"],
              correctIndex: 0,
              explanation: "E",
            },
          ],
        },
      ],
    });
    assert.equal(res.ok, false, `Expected unsafe SVG to be rejected: ${unsafeSvg}`);
  }
});
