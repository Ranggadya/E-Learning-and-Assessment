import type { PackFile, PackValidation } from "@/types/admin";
import type { QuestionType, SubtestKind } from "@/types/assessment";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VALID_TYPES: QuestionType[] = ["TEXT", "IMAGE", "MEMORY", "SPEED"];
const VALID_KINDS: SubtestKind[] = ["QUIZ", "PERSONALITY", "PAULI", "DRAWING"];
const MAX_OPTIONS = 5;
const MAX_ERRORS = 30;
// SVG ditampilkan langsung di halaman, jadi tolak elemen, SMIL animasi, link, entity, data URI, dan event handler.
const UNSAFE_SVG_PATTERN =
  /<script|<foreignObject|<iframe|<embed|<object|<animate|<set|<a[\s/>]|&#|&colon;|(?:^|[\s/"'])on[a-z]+\s*=|javascript:|data:/i;

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

// Aturan bidang pembahasan lengkap; dipakai juga oleh file pembahasan terpisah.
export function validateExplanationExtras(value: Record<string, unknown>, optionCount: number, label: string, errors: string[]): void {
  const steps = value.steps;
  if (steps !== undefined) {
    if (!Array.isArray(steps) || steps.length < 1 || steps.length > 12 || !steps.every(isNonEmptyString)) {
      errors.push(`${label}: steps harus berisi 1 sampai 12 langkah berupa teks`);
    }
  }
  const wrongNotes = value.wrongNotes;
  if (wrongNotes !== undefined) {
    if (!Array.isArray(wrongNotes) || wrongNotes.length !== optionCount || !wrongNotes.every(function isText(note) {
      return typeof note === "string";
    })) {
      errors.push(`${label}: wrongNotes harus berupa daftar teks sebanyak opsi (${optionCount}); kosongkan ("") untuk jawaban benar`);
    }
  }
  const quickTip = value.quickTip;
  if (quickTip !== undefined && !isNonEmptyString(quickTip)) {
    errors.push(`${label}: quickTip harus berupa teks yang tidak kosong`);
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

  validateExplanationExtras(value, Array.isArray(options) ? options.length : 0, label, errors);

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

      const rawKind = subtest.kind;
      let kind: SubtestKind = "QUIZ";
      if (rawKind !== undefined) {
        if (typeof rawKind !== "string" || !VALID_KINDS.includes(rawKind as SubtestKind)) {
          errors.push(`${label}.kind: harus salah satu dari ${VALID_KINDS.join(", ")}`);
        } else {
          kind = rawKind as SubtestKind;
        }
      }

      const duration = subtest.durationSeconds;
      if (kind === "QUIZ" || kind === "PERSONALITY") {
        if (!Number.isInteger(duration) || (duration as number) < 10 || (duration as number) > 10800) {
          errors.push(`${label}.durationSeconds: harus bilangan bulat 10 sampai 10800 (detik)`);
        }
      } else if (duration !== undefined) {
        if (!Number.isInteger(duration) || (duration as number) < 10 || (duration as number) > 10800) {
          errors.push(`${label}.durationSeconds: harus bilangan bulat 10 sampai 10800 (detik)`);
        }
      }

      if (kind === "QUIZ") {
        if (!Array.isArray(subtest.questions) || subtest.questions.length === 0) {
          errors.push(`${label}.questions: wajib berisi minimal satu soal`);
          return;
        }
      } else if (kind === "PERSONALITY") {
        if (!isRecord(subtest.config)) {
          errors.push(`${label}.config: wajib berupa objek konfigurasi tes kepribadian`);
        } else {
          const config = subtest.config;
          const traitKeys = new Set<string>();
          if (!Array.isArray(config.traits) || config.traits.length === 0) {
            errors.push(`${label}.config.traits: wajib berupa daftar trait minimal 1`);
          } else {
            config.traits.forEach((trait, tIdx) => {
              if (!isRecord(trait) || !isNonEmptyString(trait.key) || !isNonEmptyString(trait.name)) {
                errors.push(`${label}.config.traits[${tIdx}]: wajib memuat key dan name`);
              } else {
                traitKeys.add(trait.key);
              }
            });
          }
          if (!Array.isArray(config.statements) || config.statements.length === 0) {
            errors.push(`${label}.config.statements: wajib berupa daftar pernyataan minimal 1`);
          } else {
            config.statements.forEach((stmt, sIdx) => {
              if (!isRecord(stmt) || !isNonEmptyString(stmt.text) || !isNonEmptyString(stmt.trait)) {
                errors.push(`${label}.config.statements[${sIdx}]: wajib memuat text dan trait`);
              } else if (traitKeys.size > 0 && !traitKeys.has(stmt.trait)) {
                errors.push(`${label}.config.statements[${sIdx}]: trait "${stmt.trait}" tidak terdaftar di traits`);
              }
            });
          }
        }
      } else if (kind === "PAULI") {
        if (!isRecord(subtest.config)) {
          errors.push(`${label}.config: wajib berupa objek konfigurasi Pauli / Koran`);
        } else {
          const config = subtest.config;
          if (!Number.isInteger(config.columns) || (config.columns as number) <= 0) {
            errors.push(`${label}.config.columns: harus bilangan bulat positif`);
          }
          if (!Number.isInteger(config.digitsPerColumn) || (config.digitsPerColumn as number) < 2) {
            errors.push(`${label}.config.digitsPerColumn: harus bilangan bulat minimal 2`);
          }
          if (!Number.isInteger(config.secondsPerColumn) || (config.secondsPerColumn as number) <= 0) {
            errors.push(`${label}.config.secondsPerColumn: harus bilangan bulat positif`);
          }
        }
      } else if (kind === "DRAWING") {
        if (!isRecord(subtest.config)) {
          errors.push(`${label}.config: wajib berupa objek konfigurasi tes menggambar`);
        } else {
          const config = subtest.config;
          if (!Array.isArray(config.tasks) || config.tasks.length === 0) {
            errors.push(`${label}.config.tasks: wajib berupa daftar tugas menggambar`);
          } else {
            config.tasks.forEach((task, tIdx) => {
              if (!isRecord(task) || !isNonEmptyString(task.key) || !isNonEmptyString(task.title) || !isNonEmptyString(task.instruction)) {
                errors.push(`${label}.config.tasks[${tIdx}]: wajib memuat key, title, dan instruction`);
              }
              if (!Number.isInteger(task.seconds) || (task.seconds as number) <= 0) {
                errors.push(`${label}.config.tasks[${tIdx}].seconds: harus bilangan bulat positif`);
              }
            });
          }
          if (config.reflection !== undefined && (!Array.isArray(config.reflection) || !config.reflection.every(isNonEmptyString))) {
            errors.push(`${label}.config.reflection: harus berupa daftar teks refleksi`);
          }
        }
      }

      if (Array.isArray(subtest.questions)) {
        subtest.questions.forEach(function validateEachQuestion(question, questionIndex) {
          validateQuestion(question, `${label} soal ${questionIndex + 1}`, errors);
        });
      }
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
