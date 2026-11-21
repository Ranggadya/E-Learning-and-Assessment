import { databasePool } from "./db";
import type { ImportSummary } from "./pack-import";
import { validateExplanationExtras } from "./pack-schema";

const OPTION_KEYS = ["A", "B", "C", "D", "E"];
const MAX_ERRORS = 30;

// File pembahasan: memperbarui pembahasan soal yang sudah ada tanpa mengganti soal atau menghapus riwayat.
// Setiap butir dicocokkan lewat nomor soal, dan correctIndex wajib sama dengan kunci di database
// sehingga pembahasan tidak bisa tertukar ke soal lain.
export interface ExplanationEntry {
  number: number;
  correctIndex: number;
  explanation?: string;
  steps?: string[];
  wrongNotes?: string[];
  quickTip?: string;
}

export interface ExplanationPackFile {
  pembahasanSaja: true;
  company: { slug: string };
  package: { slug: string };
  subtests: { slug: string; explanations: ExplanationEntry[] }[];
}

export type ExplanationValidation = { ok: true; pack: ExplanationPackFile } | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isExplanationPack(input: unknown): boolean {
  return isRecord(input) && input.pembahasanSaja === true;
}

export function validateExplanationPack(input: unknown): ExplanationValidation {
  const errors: string[] = [];
  if (!isRecord(input) || input.pembahasanSaja !== true) {
    return { ok: false, errors: ["File pembahasan harus berisi pembahasanSaja: true"] };
  }
  const company = input.company;
  const pack = input.package;
  if (!isRecord(company) || typeof company.slug !== "string" || !company.slug) {
    errors.push("company.slug wajib diisi");
  }
  if (!isRecord(pack) || typeof pack.slug !== "string" || !pack.slug) {
    errors.push("package.slug wajib diisi");
  }
  if (!Array.isArray(input.subtests) || input.subtests.length === 0) {
    errors.push("subtests wajib berisi minimal satu subtes");
  } else {
    input.subtests.forEach(function checkSubtest(subtest, subtestIndex) {
      const label = `subtests[${subtestIndex}]`;
      if (!isRecord(subtest) || typeof subtest.slug !== "string" || !Array.isArray(subtest.explanations) || subtest.explanations.length === 0) {
        errors.push(`${label}: wajib berisi slug dan explanations`);
        return;
      }
      const seen = new Set<number>();
      subtest.explanations.forEach(function checkEntry(entry, entryIndex) {
        const entryLabel = `${subtest.slug} butir ${entryIndex + 1}`;
        if (!isRecord(entry) || !Number.isInteger(entry.number) || !Number.isInteger(entry.correctIndex)) {
          errors.push(`${entryLabel}: wajib punya number dan correctIndex berupa bilangan bulat`);
          return;
        }
        const number = entry.number as number;
        if (seen.has(number)) {
          errors.push(`${entryLabel}: nomor ${number} muncul dua kali`);
        }
        seen.add(number);
        if (entry.explanation !== undefined && (typeof entry.explanation !== "string" || entry.explanation.trim() === "")) {
          errors.push(`${entryLabel}: explanation tidak boleh kosong`);
        }
        const hasContent = entry.explanation !== undefined || entry.steps !== undefined || entry.wrongNotes !== undefined || entry.quickTip !== undefined;
        if (!hasContent) {
          errors.push(`${entryLabel}: tidak ada isi pembahasan`);
        }
        // Jumlah opsi dicek lagi terhadap database saat impor; di sini cukup memastikan bentuknya.
        const optionCount = Array.isArray(entry.wrongNotes) ? entry.wrongNotes.length : 0;
        validateExplanationExtras(entry, optionCount, entryLabel, errors);
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
  return { ok: true, pack: input as unknown as ExplanationPackFile };
}

export class ExplanationImportError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(problems.join("; "));
    this.problems = problems;
  }
}

export async function importExplanations(pack: ExplanationPackFile, options: { dryRun: boolean }): Promise<ImportSummary> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const packageResult = await client.query<{ id: number; name: string; company_name: string }>(
      `SELECT p.id, p.name, c.name AS company_name
       FROM test_packages p JOIN companies c ON c.id = p.company_id
       WHERE c.slug = $1 AND p.slug = $2`,
      [pack.company.slug, pack.package.slug],
    );
    const packageRow = packageResult.rows[0];
    if (!packageRow) {
      throw new ExplanationImportError([`Paket ${pack.company.slug}/${pack.package.slug} belum ada. Impor file soalnya lebih dulu.`]);
    }

    const problems: string[] = [];
    const summaries: ImportSummary["subtests"] = [];
    let total = 0;
    for (const subtest of pack.subtests) {
      const subtestResult = await client.query<{ id: number; name: string; kind: string; duration_seconds: number }>(
        "SELECT id, name, kind, duration_seconds FROM subtests WHERE test_package_id = $1 AND slug = $2",
        [packageRow.id, subtest.slug],
      );
      const subtestRow = subtestResult.rows[0];
      if (!subtestRow || subtestRow.kind !== "QUIZ") {
        problems.push(`Subtes "${subtest.slug}" tidak ditemukan atau bukan subtes pilihan ganda`);
        continue;
      }
      const questionResult = await client.query<{ id: number; order_index: number; correct_option: string; options: unknown[] }>(
        "SELECT id, order_index, correct_option, options FROM questions WHERE subtest_id = $1",
        [subtestRow.id],
      );
      const byNumber = new Map(questionResult.rows.map(function toPair(row) {
        return [row.order_index, row] as const;
      }));

      for (const entry of subtest.explanations) {
        const question = byNumber.get(entry.number);
        const label = `${subtest.slug} soal ${entry.number}`;
        if (!question) {
          problems.push(`${label}: nomor soal tidak ada di database`);
          continue;
        }
        if (OPTION_KEYS[entry.correctIndex] !== question.correct_option) {
          problems.push(`${label}: kunci di file (${OPTION_KEYS[entry.correctIndex] ?? "?"}) berbeda dengan database (${question.correct_option}); soal mungkin sudah berubah`);
          continue;
        }
        if (entry.wrongNotes && entry.wrongNotes.length !== question.options.length) {
          problems.push(`${label}: wrongNotes ${entry.wrongNotes.length} butir, opsi soal ${question.options.length}`);
          continue;
        }
        await client.query(
          `UPDATE questions SET
             explanation = COALESCE($2, explanation),
             steps = COALESCE($3::jsonb, steps),
             wrong_notes = COALESCE($4::jsonb, wrong_notes),
             quick_tip = COALESCE($5, quick_tip)
           WHERE id = $1`,
          [
            question.id,
            entry.explanation ?? null,
            entry.steps ? JSON.stringify(entry.steps) : null,
            entry.wrongNotes ? JSON.stringify(entry.wrongNotes) : null,
            entry.quickTip ?? null,
          ],
        );
        total += 1;
      }
      summaries.push({
        slug: subtest.slug,
        name: subtestRow.name,
        kind: "QUIZ",
        questionCount: subtest.explanations.length,
        durationSeconds: subtestRow.duration_seconds,
        status: "diganti",
        replacedAttemptCount: 0,
      });
    }
    if (problems.length > 0) {
      throw new ExplanationImportError(problems.slice(0, MAX_ERRORS));
    }

    await client.query(options.dryRun ? "ROLLBACK" : "COMMIT");
    return {
      companyName: packageRow.company_name,
      companyStatus: "diperbarui",
      packageName: packageRow.name,
      packageStatus: "diperbarui",
      subtests: summaries,
      totalQuestions: total,
      dryRun: options.dryRun,
      mode: "pembahasan",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
