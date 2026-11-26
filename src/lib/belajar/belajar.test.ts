import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkdownBlocks } from "./markdown";
import { parseLessonMarkdown, validateLessonBatch } from "./parser";

const SAMPLE_MD = `---
slug: javascript-closure
title: Closure di JavaScript
track: frontend            # jalur: fondasi | frontend | backend | database | devops
level: pemula              # pemula | menengah | lanjut
order: 14                  # urutan dalam jalur
prerequisites: [javascript-function]
estimated_minutes: 20
status: reviewed
origin: translated
sources:
  - title: Closures
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures#lexical_scoping
    license: CC-BY-SA-2.5
    author: Mozilla Contributors
    changes: diterjemahkan dan diringkas
---

## Apa itu closure

Sebuah closure adalah function yang mengingat scope luar. <script>alert(1)</script>

| Istilah | Arti |
| --- | --- |
| closure | Mengingat scope |

\`\`\`js
function buatCounter() {
  let count = 0; // closure di dalam kode tidak boleh diberi tag HTML
  return () => ++count;
}
\`\`\`

Baca [panduan aman](https://example.com) atau [tautan jahat](javascript:alert(1)).

![Gambar 1: Diagram closure dan scope](/images/belajar/load-balancing/image1.png)
`;

test("parseLessonMarkdown mem-parsing front-matter berkomentar, menjaga #hash di URL, dan memvalidasi sources", () => {
  const res = parseLessonMarkdown("closure.md", SAMPLE_MD);
  assert.equal(res.errors.length, 0);
  assert.ok(res.parsed);
  assert.equal(res.parsed.slug, "javascript-closure");
  assert.equal(res.parsed.track, "frontend");
  assert.equal(res.parsed.level, "pemula");
  assert.equal(res.parsed.order, 14);
  assert.deepEqual(res.parsed.prerequisites, ["javascript-function"]);
  assert.equal(res.parsed.sources.length, 1);
  assert.equal(
    res.parsed.sources[0].url,
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures#lexical_scoping",
  );
});

test("validateLessonBatch menolak bila track atau prerequisite tidak ada, dan mengizinkan prerequisite sesama batch", () => {
  const fnMd = `---
slug: javascript-function
title: Function Dasar
track: frontend
level: pemula
order: 1
origin: original
---
Isi materi function.`;

  const missingPrereq = validateLessonBatch(
    [{ fileName: "closure.md", content: SAMPLE_MD }],
    new Set(["frontend"]),
    new Set(),
  );
  assert.equal(missingPrereq.ok, false);
  assert.ok(missingPrereq.errors.some((e) => e.includes("javascript-function")));

  const missingTrack = validateLessonBatch(
    [{ fileName: "fn.md", content: fnMd }],
    new Set(["fondasi"]),
    new Set(),
  );
  assert.equal(missingTrack.ok, false);
  assert.ok(missingTrack.errors.some((e) => e.includes("frontend")));

  const validTogether = validateLessonBatch(
    [
      { fileName: "closure.md", content: SAMPLE_MD },
      { fileName: "fn.md", content: fnMd },
    ],
    new Set(["frontend"]),
    new Set(),
  );
  assert.equal(validTogether.ok, true);
  assert.equal(validTogether.validLessons.length, 2);
});

test("parseMarkdownBlocks menyanitasi XSS, membiarkan blok kode apa adanya, dan menyisipkan tooltip glosarium", () => {
  const glossary = [
    { term: "closure", definition: "Fungsi yang mengingat lexical scope." },
    { term: "scope", definition: "Cakupan variabel." },
  ];
  const parsedLesson = parseLessonMarkdown("closure.md", SAMPLE_MD).parsed!;
  const blocks = parseMarkdownBlocks(parsedLesson.bodyMd, glossary);

  const paragraph = blocks.find((b) => b.type === "paragraph");
  assert.ok(paragraph && paragraph.type === "paragraph");
  assert.ok(!paragraph.html.includes("<script>"));
  assert.ok(paragraph.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(paragraph.html.includes('class="glossary-term"'));

  const tableBlock = blocks.find((b) => b.type === "table");
  assert.ok(tableBlock && tableBlock.type === "table");
  assert.equal(tableBlock.headersHtml.length, 2);
  assert.equal(tableBlock.rowsHtml.length, 1);

  const codeBlock = blocks.find((b) => b.type === "code");
  assert.ok(codeBlock && codeBlock.type === "code");
  assert.equal(codeBlock.lang, "js");
  assert.ok(codeBlock.code.includes("let count = 0; // closure di dalam kode tidak boleh diberi tag HTML"));
  assert.ok(!codeBlock.code.includes("<dfn"));

  const linkParagraph = blocks.find(
    (b) => b.type === "paragraph" && b.html.includes("panduan aman"),
  );
  assert.ok(linkParagraph && linkParagraph.type === "paragraph");
  assert.ok(linkParagraph.html.includes('href="https://example.com"'));
  assert.ok(!linkParagraph.html.includes("javascript:"));

  const imgBlock = blocks.find((b) => b.type === "image");
  assert.ok(imgBlock && imgBlock.type === "image");
  assert.equal(imgBlock.src, "/images/belajar/load-balancing/image1.png");
  assert.ok(imgBlock.captionHtml.includes("Gambar 1:"));
  assert.ok(imgBlock.captionHtml.includes('class="glossary-term"'));
});
