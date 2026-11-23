import assert from "node:assert/strict";
import test from "node:test";
import { validateExplanationPack } from "./explanation-pack";
import { ImportConfirmationRequiredError, type ImportSummary } from "./pack-import";

function makeBaseExplanationPack(entryOverrides: Record<string, unknown> = {}) {
  return {
    pembahasanSaja: true,
    company: { slug: "astra" },
    package: { slug: "paket-1" },
    subtests: [
      {
        slug: "numerik",
        explanations: [
          {
            number: 1,
            correctIndex: 0,
            quickTip: "Cek satuan terlebih dahulu.",
            ...entryOverrides,
          },
        ],
      },
    ],
  };
}

test("validateExplanationPack menerima entri tanpa prompt maupun prompt teks tidak kosong", () => {
  const legacyRes = validateExplanationPack(makeBaseExplanationPack());
  assert.equal(legacyRes.ok, true);

  const withPromptRes = validateExplanationPack(makeBaseExplanationPack({ prompt: "Berapakah 2 + 2?" }));
  assert.equal(withPromptRes.ok, true);
  if (withPromptRes.ok) {
    assert.equal(withPromptRes.pack.subtests[0].explanations[0].prompt, "Berapakah 2 + 2?");
  }
});

test("validateExplanationPack menolak prompt opsional yang kosong atau bukan teks", () => {
  for (const invalidPrompt of ["", "   \n\t ", 123, null]) {
    const res = validateExplanationPack(makeBaseExplanationPack({ prompt: invalidPrompt }));
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.ok(
        res.errors.some((err) => err.includes("prompt opsional harus berupa teks tidak kosong")),
        `Pesan error tidak sesuai untuk prompt=${String(invalidPrompt)}: ${res.errors.join("; ")}`,
      );
    }
  }
});

test("ImportConfirmationRequiredError menyimpan summary lengkap dan mewarisi Error", () => {
  const dummySummary: ImportSummary = {
    companySlug: "astra",
    companyName: "PT Astra",
    companyStatus: "diperbarui",
    packageSlug: "paket-1",
    packageName: "Paket 1",
    packageStatus: "diperbarui",
    subtests: [],
    totalQuestions: 0,
    dryRun: false,
    contentHash: "a".repeat(64),
    isDuplicateContent: true,
    previousUploadAt: null,
    hasOverwrite: false,
    metadataChanged: false,
    requiresConfirmation: true,
    warnings: ["Isi file identik."],
  };

  const err = new ImportConfirmationRequiredError(dummySummary);
  assert.ok(err instanceof Error);
  assert.ok(err instanceof ImportConfirmationRequiredError);
  assert.equal(err.summary, dummySummary);
  assert.ok(err.message.length > 0);
});
