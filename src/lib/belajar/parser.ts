import type {
  LessonLevel,
  LessonOrigin,
  LessonSource,
  LessonStatus,
  LessonValidationItem,
  ParsedLessonInput,
} from "@/types/belajar";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_LEVELS = new Set<LessonLevel>(["pemula", "menengah", "lanjut"]);
const VALID_STATUSES = new Set<LessonStatus>(["draft", "reviewed"]);
const VALID_ORIGINS = new Set<LessonOrigin>(["original", "translated", "mixed"]);

// Buang komentar akhir baris (` # ...`) hanya di luar tanda kutip agar URL ber-anchor (`#hash`) tetap utuh.
function stripYamlComment(raw: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle && raw[i - 1] !== "\\") {
      inDouble = !inDouble;
    } else if (ch === "#" && !inSingle && !inDouble && (i === 0 || /\s/.test(raw[i - 1]))) {
      return raw.slice(0, i).trim();
    }
  }
  return raw.trim();
}

function unquoteScalar(value: string): string {
  const trimmed = stripYamlComment(value);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseInlineList(value: string): string[] | null {
  const cleaned = stripYamlComment(value);
  if (!cleaned.startsWith("[") || !cleaned.endsWith("]")) {
    return null;
  }
  const inner = cleaned.slice(1, -1).trim();
  if (!inner) {
    return [];
  }
  return inner
    .split(",")
    .map((part) => unquoteScalar(part))
    .filter((part) => part.length > 0);
}

function parseFrontMatterBlock(frontMatter: string): Record<string, unknown> {
  const lines = frontMatter.split(/\r?\n/);
  const result: Record<string, unknown> = {};
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const stripped = stripYamlComment(rawLine);
    if (!stripped) {
      i++;
      continue;
    }

    const keyMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/.exec(rawLine);
    if (!keyMatch) {
      i++;
      continue;
    }

    const key = keyMatch[1];
    const rest = stripYamlComment(keyMatch[2]);

    if (rest !== "") {
      const inlineArr = parseInlineList(rest);
      result[key] = inlineArr !== null ? inlineArr : unquoteScalar(rest);
      i++;
      continue;
    }

    // Nilai kosong setelah titik dua -> periksa blok list di bawahnya (`  - ...`).
    const listItems: unknown[] = [];
    i++;
    while (i < lines.length) {
      const nextRaw = lines[i];
      if (!stripYamlComment(nextRaw)) {
        i++;
        continue;
      }
      if (!/^\s+/.test(nextRaw)) {
        break;
      }
      const itemMatch = /^\s+-\s*(.*)$/.exec(nextRaw);
      if (!itemMatch) {
        i++;
        continue;
      }
      const firstRest = stripYamlComment(itemMatch[1]);
      const kvInFirst = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/.exec(firstRest);
      if (kvInFirst) {
        const obj: Record<string, string> = {
          [kvInFirst[1]]: unquoteScalar(kvInFirst[2]),
        };
        i++;
        while (i < lines.length) {
          const propLine = lines[i];
          if (!stripYamlComment(propLine)) {
            i++;
            continue;
          }
          if (/^\s+-\s/.test(propLine) || !/^\s{2,}/.test(propLine)) {
            break;
          }
          const propMatch = /^\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/.exec(propLine);
          if (propMatch) {
            obj[propMatch[1]] = unquoteScalar(propMatch[2]);
          }
          i++;
        }
        listItems.push(obj);
      } else {
        if (firstRest) {
          listItems.push(unquoteScalar(firstRest));
        }
        i++;
      }
    }
    result[key] = listItems;
  }

  return result;
}

export function parseLessonMarkdown(
  fileName: string,
  rawMarkdown: string,
): { parsed: ParsedLessonInput | null; partial: LessonValidationItem; errors: string[] } {
  const normalized = rawMarkdown.replace(/^\uFEFF/, "");
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(normalized);

  if (!fmMatch) {
    const errors = ["Front-matter YAML (`--- ... ---`) tidak ditemukan di awal file."];
    return {
      parsed: null,
      errors,
      partial: {
        fileName,
        slug: null,
        title: null,
        track: null,
        chapter: null,
        level: null,
        order: null,
        status: null,
        origin: null,
        prerequisites: [],
        sourcesCount: 0,
        action: "invalid",
        errors,
      },
    };
  }

  const meta = parseFrontMatterBlock(fmMatch[1]);
  const bodyMd = fmMatch[2].trim();
  const errors: string[] = [];

  const slug = typeof meta.slug === "string" ? meta.slug.trim() : "";
  if (!slug || !SLUG_RE.test(slug)) {
    errors.push("`slug` wajib diisi dengan huruf kecil, angka, dan tanda hubung (contoh: `javascript-closure`).");
  }

  const title = typeof meta.title === "string" ? meta.title.trim() : "";
  if (!title) {
    errors.push("`title` wajib diisi.");
  }

  const track = typeof meta.track === "string" ? meta.track.trim() : "";
  if (!track || !SLUG_RE.test(track)) {
    errors.push("`track` wajib diisi dengan slug jalur yang valid.");
  }

  const chapter =
    typeof meta.chapter === "string" && meta.chapter.trim()
      ? meta.chapter.trim()
      : null;

  const rawLevel = typeof meta.level === "string" ? meta.level.trim() : "";
  const level = VALID_LEVELS.has(rawLevel as LessonLevel) ? (rawLevel as LessonLevel) : null;
  if (!level) {
    errors.push("`level` harus salah satu dari: `pemula`, `menengah`, `lanjut`.");
  }

  const rawOrder = typeof meta.order === "string" ? Number(meta.order) : NaN;
  const order = Number.isInteger(rawOrder) && rawOrder >= 0 ? rawOrder : null;
  if (order === null) {
    errors.push("`order` harus berupa bilangan bulat >= 0.");
  }

  let estimatedMinutes: number | null = null;
  if (meta.estimated_minutes !== undefined && meta.estimated_minutes !== "") {
    const parsedMin = Number(meta.estimated_minutes);
    if (!Number.isInteger(parsedMin) || parsedMin < 1 || parsedMin > 600) {
      errors.push("`estimated_minutes` harus bilangan bulat antara 1 sampai 600.");
    } else {
      estimatedMinutes = parsedMin;
    }
  }

  const rawStatus =
    meta.status === undefined || meta.status === ""
      ? "draft"
      : typeof meta.status === "string"
        ? meta.status.trim()
        : "";
  const status = VALID_STATUSES.has(rawStatus as LessonStatus) ? (rawStatus as LessonStatus) : null;
  if (!status) {
    errors.push("`status` harus `draft` atau `reviewed`.");
  }

  const rawOrigin = typeof meta.origin === "string" ? meta.origin.trim() : "";
  const origin = VALID_ORIGINS.has(rawOrigin as LessonOrigin) ? (rawOrigin as LessonOrigin) : null;
  if (!origin) {
    errors.push("`origin` harus `original`, `translated`, atau `mixed`.");
  }

  const prerequisites: string[] = [];
  if (meta.prerequisites !== undefined) {
    if (!Array.isArray(meta.prerequisites)) {
      errors.push("`prerequisites` harus berupa daftar slug (contoh: `[html-dasar, css-dasar]`).");
    } else {
      for (const item of meta.prerequisites) {
        if (typeof item !== "string" || !SLUG_RE.test(item.trim())) {
          errors.push(`Slug prerequisite tidak valid: \`${String(item)}\`.`);
        } else if (item.trim() === slug) {
          errors.push("Pelajaran tidak boleh menjadi prerequisite bagi dirinya sendiri.");
        } else if (!prerequisites.includes(item.trim())) {
          prerequisites.push(item.trim());
        }
      }
    }
  }

  const sources: LessonSource[] = [];
  if (meta.sources !== undefined) {
    if (!Array.isArray(meta.sources)) {
      errors.push("`sources` harus berupa daftar objek sumber.");
    } else {
      meta.sources.forEach((rawSrc, idx) => {
        if (!rawSrc || typeof rawSrc !== "object") {
          errors.push(`Sumber #${idx + 1} harus berupa objek.`);
          return;
        }
        const rec = rawSrc as Record<string, unknown>;
        const srcTitle = typeof rec.title === "string" ? rec.title.trim() : "";
        const srcUrl = typeof rec.url === "string" ? rec.url.trim() : "";
        if (!srcTitle) {
          errors.push(`Sumber #${idx + 1}: \`title\` wajib diisi.`);
        }
        if (!/^https?:\/\/\S+$/i.test(srcUrl)) {
          errors.push(`Sumber #${idx + 1}: \`url\` harus diawali http:// atau https://.`);
        }
        if (srcTitle && /^https?:\/\/\S+$/i.test(srcUrl)) {
          sources.push({
            title: srcTitle,
            url: srcUrl,
            license: typeof rec.license === "string" && rec.license.trim() ? rec.license.trim() : null,
            author: typeof rec.author === "string" && rec.author.trim() ? rec.author.trim() : null,
            changes: typeof rec.changes === "string" && rec.changes.trim() ? rec.changes.trim() : null,
          });
        }
      });
    }
  }

  if (origin && origin !== "original" && sources.length === 0) {
    errors.push("Pelajaran dengan `origin` selain `original` wajib mencantumkan minimal satu `sources` untuk atribusi.");
  }

  if (!bodyMd) {
    errors.push("Isi Markdown pelajaran tidak boleh kosong.");
  }

  const partial: LessonValidationItem = {
    fileName,
    slug: slug || null,
    title: title || null,
    track: track || null,
    chapter,
    level,
    order,
    status,
    origin,
    prerequisites,
    sourcesCount: sources.length,
    action: errors.length === 0 ? "create" : "invalid",
    errors,
  };

  if (errors.length > 0 || !level || order === null || !status || !origin) {
    return { parsed: null, partial, errors };
  }

  return {
    parsed: {
      fileName,
      slug,
      title,
      track,
      chapter,
      level,
      order,
      prerequisites,
      estimatedMinutes,
      status,
      origin,
      sources,
      bodyMd,
    },
    partial,
    errors: [],
  };
}

export function validateLessonBatch(
  files: Array<{ fileName: string; content: string }>,
  existingTrackSlugs: Set<string>,
  existingLessonSlugs: Set<string>,
): {
  ok: boolean;
  items: LessonValidationItem[];
  validLessons: ParsedLessonInput[];
  errors: string[];
} {
  const parsedResults = files.map((f) => parseLessonMarkdown(f.fileName, f.content));
  const seenBatchSlugs = new Set<string>();
  const allKnownLessonSlugs = new Set<string>(existingLessonSlugs);

  for (const res of parsedResults) {
    if (res.partial.slug) {
      if (seenBatchSlugs.has(res.partial.slug)) {
        res.partial.errors.push(`Slug \`${res.partial.slug}\` duplikat di dalam unggahan yang sama.`);
      } else {
        seenBatchSlugs.add(res.partial.slug);
        allKnownLessonSlugs.add(res.partial.slug);
      }
    }
  }

  const validLessons: ParsedLessonInput[] = [];
  const allErrors: string[] = [];

  for (const res of parsedResults) {
    const item = res.partial;
    if (item.track && !existingTrackSlugs.has(item.track)) {
      item.errors.push(`Jalur (track) \`${item.track}\` tidak terdaftar di database.`);
    }
    for (const prereq of item.prerequisites) {
      if (!allKnownLessonSlugs.has(prereq)) {
        item.errors.push(`Prerequisite \`${prereq}\` belum ada di database maupun di batch unggahan ini.`);
      }
    }

    if (item.errors.length > 0 || !res.parsed) {
      item.action = "invalid";
      for (const err of item.errors) {
        allErrors.push(`${item.fileName}: ${err}`);
      }
    } else {
      item.action = existingLessonSlugs.has(res.parsed.slug) ? "update" : "create";
      validLessons.push(res.parsed);
    }
  }

  return {
    ok: allErrors.length === 0 && validLessons.length > 0,
    items: parsedResults.map((r) => r.partial),
    validLessons,
    errors: allErrors,
  };
}
