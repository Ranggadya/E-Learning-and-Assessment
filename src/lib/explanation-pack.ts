import { findPreviousSuccessfulUpload } from "./audit-log";
import {
  compareExplanationSubtest,
  computeCanonicalHash,
  hasDetailedExplanation,
  type ExistingQuestionSnapshot,
  type ExplanationSpotCheck,
} from "./import-analysis";
import {
  formatUploadTimestamp,
  ImportConfirmationRequiredError,
  type ImportDbClient,
  type ImportExecutionOptions,
  type ImportedSubtestSummary,
  type ImportSummary,
} from "./pack-import";
import { validateExplanationExtras } from "./pack-schema";
import type { QuestionOption, QuestionType } from "./types";

const OPTION_KEYS = ["A", "B", "C", "D", "E"];
const MAX_ERRORS = 30;
const MAX_TOTAL_SPOT_CHECKS = 6;

// File pembahasan: memperbarui pembahasan soal yang sudah ada tanpa mengganti soal atau menghapus riwayat.
// Setiap butir dicocokkan lewat nomor soal, dan correctIndex wajib sama dengan kunci di database
// sehingga pembahasan tidak bisa tertukar ke soal lain.
export interface ExplanationEntry {
  number: number;
  correctIndex: number;
  prompt?: string;
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
    const seenSlugs = new Set<string>();
    input.subtests.forEach(function checkSubtest(subtest, subtestIndex) {
      const label = `subtests[${subtestIndex}]`;
      if (!isRecord(subtest) || typeof subtest.slug !== "string" || !subtest.slug.trim() || !Array.isArray(subtest.explanations) || subtest.explanations.length === 0) {
        errors.push(`${label}: wajib berisi slug dan explanations`);
        return;
      }
      if (seenSlugs.has(subtest.slug)) {
        errors.push(`${label}.slug: "${subtest.slug}" dipakai dua kali dalam file ini`);
      }
      seenSlugs.add(subtest.slug);

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
        if (entry.prompt !== undefined && (typeof entry.prompt !== "string" || entry.prompt.trim() === "")) {
          errors.push(`${entryLabel}: prompt opsional harus berupa teks tidak kosong`);
        }
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

interface PendingExplanationUpdate {
  questionId: number;
  entry: ExplanationEntry;
}

export async function importExplanations(
  pack: ExplanationPackFile,
  options: ImportExecutionOptions,
): Promise<ImportSummary> {
  const contentHash = options.contentHash ?? computeCanonicalHash(pack);
  const lookupPrevious = options.findPreviousUpload ?? findPreviousSuccessfulUpload;
  const previousUpload = await lookupPrevious(contentHash);

  const client: ImportDbClient = options.connectClient
    ? await options.connectClient()
    : await (await import("./db")).databasePool.connect();
  let inTransaction = false;

  try {
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
    const summaries: ImportedSubtestSummary[] = [];
    const allSpotChecks: ExplanationSpotCheck[] = [];
    const pendingUpdates: PendingExplanationUpdate[] = [];
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

      const questionResult = await client.query<{
        id: number;
        order_index: number;
        type: QuestionType;
        prompt: string;
        image_svg: string | null;
        options: QuestionOption[];
        correct_option: string;
        explanation: string | null;
        steps: string[] | null;
        wrong_notes: string[] | null;
        quick_tip: string | null;
      }>(
        `SELECT id, order_index, type, prompt, image_svg, options, correct_option, explanation, steps, wrong_notes, quick_tip
         FROM questions
         WHERE subtest_id = $1
         ORDER BY order_index`,
        [subtestRow.id],
      );

      const byNumber = new Map(questionResult.rows.map((row) => [row.order_index, row] as const));
      const existingSnapshots: ExistingQuestionSnapshot[] = questionResult.rows.map((row) => ({
        orderIndex: row.order_index,
        type: row.type ?? "TEXT",
        prompt: row.prompt,
        imageSvg: row.image_svg ?? null,
        options: Array.isArray(row.options) ? row.options.map((opt) => opt.label) : [],
        correctIndex: OPTION_KEYS.indexOf(row.correct_option),
        explanation: row.explanation ?? "",
        steps: row.steps ?? null,
        wrongNotes: row.wrong_notes ?? null,
        quickTip: row.quick_tip ?? null,
      }));

      let subtestHasError = false;
      const subtestUpdates: PendingExplanationUpdate[] = [];

      for (const entry of subtest.explanations) {
        const question = byNumber.get(entry.number);
        const label = `${subtest.slug} soal ${entry.number}`;
        if (!question) {
          problems.push(`${label}: nomor soal tidak ada di database`);
          subtestHasError = true;
          continue;
        }
        if (OPTION_KEYS[entry.correctIndex] !== question.correct_option) {
          problems.push(`${label}: kunci di file (${OPTION_KEYS[entry.correctIndex] ?? "?"}) berbeda dengan database (${question.correct_option}); soal mungkin sudah berubah`);
          subtestHasError = true;
          continue;
        }
        if (entry.wrongNotes && entry.wrongNotes.length !== question.options.length) {
          problems.push(`${label}: wrongNotes ${entry.wrongNotes.length} butir, opsi soal ${question.options.length}`);
          subtestHasError = true;
          continue;
        }
        subtestUpdates.push({ questionId: question.id, entry });
      }

      const comparison = compareExplanationSubtest(
        subtest.slug,
        subtestRow.name,
        existingSnapshots,
        subtest.explanations,
      );
      if (comparison.promptMismatchErrors.length > 0) {
        problems.push(...comparison.promptMismatchErrors);
        subtestHasError = true;
      }

      for (const spot of comparison.spotChecks) {
        if (allSpotChecks.length < MAX_TOTAL_SPOT_CHECKS) {
          allSpotChecks.push(spot);
        }
      }

      if (!subtestHasError && comparison.changeType !== "identik") {
        const changedSet = new Set(comparison.changedNumbers);
        for (const item of subtestUpdates) {
          if (changedSet.has(item.entry.number)) {
            pendingUpdates.push(item);
          }
        }
      }

      total += subtest.explanations.length;
      summaries.push({
        slug: subtest.slug,
        name: subtestRow.name,
        kind: "QUIZ",
        questionCount: subtest.explanations.length,
        durationSeconds: subtestRow.duration_seconds,
        status: "diganti",
        replacedAttemptCount: 0,
        changeType: comparison.changeType,
        existingQuestionCount: comparison.existingQuestionCount,
        changedQuestionCount: comparison.changedNumbers.length,
        existingDetailedCount: existingSnapshots.filter(hasDetailedExplanation).length,
        incomingDetailedCount: subtest.explanations.filter(hasDetailedExplanation).length,
        losesDetailedExplanations: false,
        coverageMismatch: comparison.coverageMismatch,
        existingDetailedOverwriteCount: comparison.existingDetailedOverwriteCount,
      });
    }

    if (problems.length > 0) {
      throw new ExplanationImportError(problems.slice(0, MAX_ERRORS));
    }

    const isDuplicateContent = summaries.length > 0 && summaries.every((s) => s.changeType === "identik");
    const hasOverwrite = summaries.some((s) => (s.existingDetailedOverwriteCount ?? 0) > 0);
    const hasCoverageMismatch = summaries.some((s) => s.coverageMismatch);
    const requiresConfirmation = isDuplicateContent || hasOverwrite || hasCoverageMismatch;

    const warnings: string[] = [];
    if (isDuplicateContent) {
      const prevLabel = previousUpload
        ? ` (terakhir diunggah ${formatUploadTimestamp(previousUpload.createdAt)})`
        : "";
      warnings.push(
        `Isi file pembahasan ini identik dengan pembahasan yang sudah ada di database${prevLabel}. Jika dilanjutkan, subtes identik dilewati tanpa mengubah soal.`,
      );
    }

    const totalDetailedOverwrite = summaries.reduce(
      (sum, s) => sum + (s.existingDetailedOverwriteCount ?? 0),
      0,
    );
    if (totalDetailedOverwrite > 0) {
      warnings.push(
        `${totalDetailedOverwrite} soal sudah memiliki pembahasan rinci di database dan isinya akan ditimpa oleh file ini.`,
      );
    }

    for (const sub of summaries) {
      if (sub.coverageMismatch) {
        warnings.push(
          `Jumlah butir pembahasan subtes "${sub.name}" (${sub.questionCount}) tidak sama dengan jumlah soal di database (${sub.existingQuestionCount}).`,
        );
      }
    }

    const summary: ImportSummary = {
      companySlug: pack.company.slug,
      companyName: packageRow.company_name,
      companyStatus: "diperbarui",
      packageSlug: pack.package.slug,
      packageName: packageRow.name,
      packageStatus: "diperbarui",
      subtests: summaries,
      totalQuestions: total,
      dryRun: options.dryRun,
      mode: "pembahasan",
      contentHash,
      isDuplicateContent,
      previousUploadAt: previousUpload?.createdAt ?? null,
      hasOverwrite,
      metadataChanged: false,
      requiresConfirmation,
      warnings,
      spotChecks: allSpotChecks,
    };

    if (options.dryRun) {
      return summary;
    }

    if (requiresConfirmation && !options.force) {
      throw new ImportConfirmationRequiredError(summary);
    }

    if (pendingUpdates.length > 0) {
      const questionIds: number[] = [];
      const explanations: (string | null)[] = [];
      const stepsJson: (string | null)[] = [];
      const wrongNotesJson: (string | null)[] = [];
      const quickTips: (string | null)[] = [];

      for (const { questionId, entry } of pendingUpdates) {
        questionIds.push(questionId);
        explanations.push(entry.explanation ?? null);
        stepsJson.push(entry.steps ? JSON.stringify(entry.steps) : null);
        wrongNotesJson.push(entry.wrongNotes ? JSON.stringify(entry.wrongNotes) : null);
        quickTips.push(entry.quickTip ?? null);
      }

      await client.query("BEGIN");
      inTransaction = true;
      await client.query(
        `UPDATE questions AS q
         SET
           explanation = COALESCE(u.explanation, q.explanation),
           steps = COALESCE(u.steps::jsonb, q.steps),
           wrong_notes = COALESCE(u.wrong_notes::jsonb, q.wrong_notes),
           quick_tip = COALESCE(u.quick_tip, q.quick_tip)
         FROM UNNEST($1::int[], $2::text[], $3::text[], $4::text[], $5::text[])
           AS u(id, explanation, steps, wrong_notes, quick_tip)
         WHERE q.id = u.id`,
        [questionIds, explanations, stepsJson, wrongNotesJson, quickTips],
      );
      await client.query("COMMIT");
      inTransaction = false;
    }

    return summary;
  } catch (error) {
    if (inTransaction) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}
