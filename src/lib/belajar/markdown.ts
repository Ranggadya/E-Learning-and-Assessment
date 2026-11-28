import type { GlossaryEntry, MarkdownBlock } from "@/types/belajar";

export function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

function sanitizeHref(rawHref: string): string | null {
  const trimmed = rawHref.trim();
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    (trimmed.startsWith("/") && !trimmed.startsWith("//")) ||
    trimmed.startsWith("#")
  ) {
    return escapeHtml(trimmed);
  }
  return null;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function injectGlossaryTooltips(escapedText: string, glossary: GlossaryEntry[]): string {
  if (glossary.length === 0 || !escapedText.trim()) {
    return escapedText;
  }
  // Urutkan istilah terpanjang dulu supaya "foreign key" cocok sebelum kata pendek.
  const sorted = [...glossary].sort((a, b) => b.term.length - a.term.length);
  const byLower = new Map<string, GlossaryEntry>();
  for (const entry of sorted) {
    byLower.set(entry.term.toLowerCase(), entry);
  }
  const pattern = new RegExp(
    `\\b(${sorted.map((g) => escapeRegExp(escapeHtml(g.term))).join("|")})\\b`,
    "gi",
  );
  const seenInSegment = new Set<string>();

  return escapedText.replace(pattern, (matched) => {
    const key = matched.toLowerCase();
    const entry = byLower.get(key);
    if (!entry || seenInSegment.has(key)) {
      return matched;
    }
    seenInSegment.add(key);
    const safeDef = escapeHtml(entry.definition);
    return `<dfn tabindex="0" class="glossary-term" data-tip="${safeDef}" aria-label="${escapeHtml(entry.term)}: ${safeDef}">${matched}</dfn>`;
  });
}

// Memformat teks inline dengan aman: semua HTML mentah di-escape lebih dulu, inline code & URL terlindung dari tooltip.
export function renderSafeInline(raw: string, glossary: GlossaryEntry[] = []): string {
  const placeholders: string[] = [];
  const pushToken = (html: string): string => {
    const idx = placeholders.push(html) - 1;
    return `\u0000TOK${idx}\u0000`;
  };

  // 1. Lindungi inline code (`...`) mentah tanpa modifikasi isi.
  let working = raw.replace(/`([^`\r\n]+)`/g, (_, codeContent: string) =>
    pushToken(
      `<code class="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-[0.85em] text-ink">${escapeHtml(codeContent)}</code>`,
    ),
  );

  // 2. Lindungi tautan [label](url) dengan validasi skema URL anti-XSS.
  working = working.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
    const safeHref = sanitizeHref(href);
    const safeLabel = escapeHtml(label);
    if (!safeHref) {
      return safeLabel;
    }
    const isExternal = /^https?:\/\//i.test(href.trim());
    const extAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
    return pushToken(
      `<a href="${safeHref}"${extAttrs} class="font-semibold text-brand-text underline hover:opacity-85">${safeLabel}</a>`,
    );
  });

  // 3. Escape seluruh HTML mentah pada sisa teks prosa agar bebas XSS.
  let safe = escapeHtml(working);

  // 4. Bold & italic.
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-ink">$1</strong>');
  safe = safe.replace(/(^|[^*])\*([^*\r\n]+)\*(?!\*)/g, '$1<em class="italic">$2</em>');

  // 5. Sisipkan tooltip glosarium hanya pada teks di luar tag HTML & placeholder.
  if (glossary.length > 0) {
    safe = safe
      .split(/(<[^>]+>|\u0000TOK\d+\u0000)/g)
      .map((part) => {
        if (part.startsWith("<") || part.startsWith("\u0000TOK")) {
          return part;
        }
        return injectGlossaryTooltips(part, glossary);
      })
      .join("");
  }

  // 6. Kembalikan token inline code & tautan.
  return safe.replace(/\u0000TOK(\d+)\u0000/g, (_, idxStr: string) => placeholders[Number(idxStr)] ?? "");
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|") && !trimmed.includes("-")) {
    return false;
  }
  const cells = splitTableRow(trimmed);
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

export function parseMarkdownBlocks(
  markdown: string,
  glossary: GlossaryEntry[] = [],
): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // 1. Fenced code block (` ```lang ... ``` `) — isi kode sama sekali tidak diubah.
    const fenceMatch = /^```([a-zA-Z0-9_+-]*)\s*$/.exec(line.trim());
    if (fenceMatch) {
      const lang = fenceMatch[1] || "text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        i++; // lewati penutup ```
      }
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    // 1b. Collapsible <details><summary>...</summary> ... </details> (mis. kunci jawaban latihan).
    if (/^<details>\s*$/i.test(line.trim())) {
      i++;
      let summaryText = "Lihat detail";
      while (i < lines.length && !lines[i].trim()) {
        i++;
      }
      if (i < lines.length) {
        const sumMatch = /^<summary>([\s\S]*?)<\/summary>\s*$/i.exec(lines[i].trim());
        if (sumMatch) {
          summaryText = sumMatch[1].trim() || summaryText;
          i++;
        }
      }
      const innerLines: string[] = [];
      while (i < lines.length && !/^<\/details>\s*$/i.test(lines[i].trim())) {
        innerLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        i++; // lewati </details>
      }
      blocks.push({
        type: "details",
        summaryHtml: renderSafeInline(summaryText, []),
        blocks: parseMarkdownBlocks(innerLines.join("\n"), glossary),
      });
      continue;
    }

    // 2. Horizontal rule
    if (/^(?:---|\*\*\*|___)\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 2b. Gambar blok penuh: ![caption atau alt](/images/...) diikuti opsional *Gambar X.Y — ...*
    const imageMatch = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line.trim());
    if (imageMatch) {
      const rawAlt = imageMatch[1].trim();
      const safeSrc = sanitizeHref(imageMatch[2].trim());
      if (safeSrc) {
        i++;
        let explicitCaption: string | null = null;
        if (i < lines.length) {
          const capMatch = /^\*([^*\r\n]+)\*\s*$/.exec(lines[i].trim());
          if (capMatch) {
            explicitCaption = capMatch[1].trim();
            i++;
          }
        }
        const captionSource = explicitCaption ?? rawAlt;
        blocks.push({
          type: "image",
          src: safeSrc,
          alt: escapeHtml(rawAlt || explicitCaption || "Diagram materi"),
          captionHtml: captionSource ? renderSafeInline(captionSource, glossary) : "",
        });
        continue;
      }
    }

    // 3. Heading (# .. ####) — tanpa tooltip agar heading tetap bersih
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      const depth = headingMatch[1].length as 1 | 2 | 3 | 4;
      const rawText = headingMatch[2].trim();
      blocks.push({
        type: "heading",
        depth,
        id: slugifyHeading(rawText),
        html: renderSafeInline(rawText, []),
      });
      i++;
      continue;
    }

    // 4. Tabel GFM
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(line).map((cell) => renderSafeInline(cell, []));
      i += 2;
      const rowsHtml: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        const cells = splitTableRow(lines[i]).map((cell) => renderSafeInline(cell, glossary));
        rowsHtml.push(cells);
        i++;
      }
      blocks.push({ type: "table", headersHtml: headers, rowsHtml });
      continue;
    }

    // 5. Blockquote (> ...)
    if (line.trimStart().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith(">")) {
        quoteLines.push(lines[i].trimStart().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        html: renderSafeInline(quoteLines.join(" "), glossary),
      });
      continue;
    }

    // 6. Unordered / Ordered list (mendukung baris lanjutan berindentasi seperti opsi a/b/c/d)
    const ulMatch = /^(\s*)[-*]\s+(.+)$/.exec(line);
    const olMatch = /^(\s*)\d+\.\s+(.+)$/.exec(line);
    if (ulMatch || olMatch) {
      const ordered = Boolean(olMatch);
      const baseIndent = (olMatch ? olMatch[1] : ulMatch![1]).length;
      const itemRegex = ordered ? /^(\s*)\d+\.\s+(.+)$/ : /^(\s*)[-*]\s+(.+)$/;
      const itemsHtml: string[] = [];
      while (i < lines.length) {
        const m = itemRegex.exec(lines[i]);
        if (!m || m[1].length !== baseIndent) break;
        const segments: string[] = [renderSafeInline(m[2].trim(), glossary)];
        i++;
        while (i < lines.length && lines[i].trim()) {
          const nextLine = lines[i];
          const nextIndent = nextLine.match(/^\s*/)?.[0].length ?? 0;
          if (nextIndent <= baseIndent) break;
          segments.push(renderSafeInline(nextLine.trim(), glossary));
          i++;
        }
        itemsHtml.push(segments.join("<br />"));
      }
      blocks.push({ type: "list", ordered, itemsHtml });
      continue;
    }

    // 7. Paragraf biasa
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i].trim()) &&
      !/^<details>\s*$/i.test(lines[i].trim()) &&
      !/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.test(lines[i].trim()) &&
      !/^#{1,4}\s+/.test(lines[i].trim()) &&
      !/^(?:---|\*\*\*|___)\s*$/.test(lines[i].trim()) &&
      !lines[i].trimStart().startsWith(">") &&
      !/^\s*(?:[-*]|\d+\.)\s+/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({
      type: "paragraph",
      html: renderSafeInline(paraLines.join(" "), glossary),
    });
  }

  return blocks;
}
