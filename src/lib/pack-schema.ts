import type { QuestionType } from "./types";

// Format satu file paket soal. Satu file = satu paket milik satu perusahaan.
export interface PackQuestion {
  type?: QuestionType;
  prompt: string;
  imageSvg?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PackSubtest {
  slug: string;
  name: string;
  description?: string;
  durationSeconds: number;
  questions: PackQuestion[];
}

export interface PackFile {
  company: { slug: string; name: string; description?: string };
  package: { slug: string; name: string; description?: string };
  subtests: PackSubtest[];
}

export type PackValidation = { ok: true; pack: PackFile } | { ok: false; errors: string[] };

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VALID_TYPES: QuestionType[] = ["TEXT", "IMAGE", "MEMORY", "SPEED"];
const MAX_OPTIONS = 5;
const MAX_ERRORS = 30;
// SVG ditampilkan langsung di halaman, jadi tolak elemen dan atribut yang bisa menjalankan kode.
const UNSAFE_SVG_PATTERN = /<script|<foreignObject|<iframe|<embed|<object|\son[a-z]+\s*=|javascript:|data:text\/html/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function validateIdentity(value: unknown, label: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${label}: wajib berupa objek berisi slug dan name`);
    return;
  }
  if (!isNonEmptyString(value.slug) || !SLUG_PATTERN.test(value.slug)) {
    errors.push(`${label}.slug: wajib huruf kecil, angka, dan tanda hubung (contoh: "paket-1")`);
  }
  if (!isNonEmptyString(value.name)) {
    errors.push(`${label}.name: tidak boleh kosong`);
  }
  if (value.description !== undefined && typeof value.description !== "string") {
    errors.push(`${label}.description: harus berupa teks`);
  }
}

function validateQuestion(value: unknown, label: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${label}: wajib berupa objek`);
    return;
  }
  if (!isNonEmptyString(value.prompt)) {
    errors.push(`${label}: prompt kosong`);
  }
  if (!isNonEmptyString(value.explanation)) {
    errors.push(`${label}: pembahasan (explanation) kosong`);
  }

  const type = value.type;
  if (type !== undefined && !VALID_TYPES.includes(type as QuestionType)) {
    errors.push(`${label}: type harus salah satu dari ${VALID_TYPES.join(", ")}`);
  }

  const options = value.options;
  if (!Array.isArray(options) || options.length < 2 || options.length > MAX_OPTIONS) {
    errors.push(`${label}: jumlah opsi harus 2 sampai ${MAX_OPTIONS}`);
  } else {
    if (!options.every(isNonEmptyString)) {
      errors.push(`${label}: setiap opsi harus berupa teks yang tidak kosong`);
    } else if (new Set(options).size !== options.length) {
      errors.push(`${label}: ada opsi yang sama persis`);
    }
    const correctIndex = value.correctIndex;
    if (!Number.isInteger(correctIndex) || (correctIndex as number) < 0 || (correctIndex as number) >= options.length) {
      errors.push(`${label}: correctIndex harus bilangan bulat 0 sampai ${options.length - 1}`);
    }
  }

  const imageSvg = value.imageSvg;
  if (imageSvg !== undefined) {
    if (typeof imageSvg !== "string" || !imageSvg.trim().startsWith("<svg")) {
      errors.push(`${label}: imageSvg harus berupa teks yang diawali <svg`);
    } else if (UNSAFE_SVG_PATTERN.test(imageSvg)) {
      errors.push(`${label}: imageSvg memuat elemen atau atribut yang tidak diizinkan (script, event handler, dsb.)`);
    }
  }
  if ((type === "IMAGE" || type === "MEMORY") && imageSvg === undefined) {
    errors.push(`${label}: soal bertipe ${String(type)} wajib punya imageSvg`);
  }
}

export function validatePack(input: unknown): PackValidation {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["File harus berupa objek JSON dengan kunci company, package, dan subtests"] };
  }

  validateIdentity(input.company, "company", errors);
  validateIdentity(input.package, "package", errors);

  const subtests = input.subtests;
  if (!Array.isArray(subtests) || subtests.length === 0) {
    errors.push("subtests: wajib berupa daftar berisi minimal satu subtes");
  } else {
    const seenSlugs = new Set<string>();
    subtests.forEach(function validateSubtest(subtest, subtestIndex) {
      const label = `subtests[${subtestIndex}]`;
      validateIdentity(subtest, label, errors);
      if (!isRecord(subtest)) {
        return;
      }
      if (typeof subtest.slug === "string") {
        if (seenSlugs.has(subtest.slug)) {
          errors.push(`${label}.slug: "${subtest.slug}" dipakai dua kali dalam paket ini`);
        }
        seenSlugs.add(subtest.slug);
      }
      const duration = subtest.durationSeconds;
      if (!Number.isInteger(duration) || (duration as number) < 10 || (duration as number) > 10800) {
        errors.push(`${label}.durationSeconds: harus bilangan bulat 10 sampai 10800 (detik)`);
      }
      if (!Array.isArray(subtest.questions) || subtest.questions.length === 0) {
        errors.push(`${label}.questions: wajib berisi minimal satu soal`);
        return;
      }
      subtest.questions.forEach(function validateEachQuestion(question, questionIndex) {
        validateQuestion(question, `${label} soal ${questionIndex + 1}`, errors);
      });
    });
  }

  if (errors.length > 0) {
    const shown = errors.slice(0, MAX_ERRORS);
    if (errors.length > MAX_ERRORS) {
      shown.push(`...dan ${errors.length - MAX_ERRORS} masalah lain`);
    }
    return { ok: false, errors: shown };
  }
  return { ok: true, pack: input as unknown as PackFile };
}
