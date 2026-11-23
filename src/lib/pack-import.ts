import type { PoolClient } from "pg";
import { findPreviousSuccessfulUpload } from "./audit-log";
import {
  compareContainerMetadata,
  compareSubtestContent,
  computeCanonicalHash,
  hasDetailedExplanation,
  type ExistingQuestionSnapshot,
  type ExistingSubtestSnapshot,
  type ExplanationSpotCheck,
  type IncomingSubtestSnapshot,
  type SubtestChangeType,
} from "./import-analysis";
import type { PackFile } from "./pack-schema";
import {
  countSubtestItems,
  resolveSubtestDuration,
  type QuestionOption,
  type QuestionType,
  type SubtestKind,
} from "./types";

const OPTION_KEYS = ["A", "B", "C", "D", "E"];

export interface ImportedSubtestSummary {
  slug: string;
  name: string;
  kind: SubtestKind;
  questionCount: number;
  durationSeconds: number;
  status: "baru" | "diganti";
  // Jumlah percobaan lama pada subtes ini yang detail jawabannya ikut terhapus saat soal diganti.
  replacedAttemptCount: number;
  changeType: SubtestChangeType;
  existingQuestionCount: number;
  changedQuestionCount: number;
  existingDetailedCount: number;
  incomingDetailedCount: number;
  losesDetailedExplanations: boolean;
  coverageMismatch?: boolean;
  existingDetailedOverwriteCount?: number;
}

export interface ImportSummary {
  companySlug: string;
  companyName: string;
  companyStatus: "baru" | "diperbarui";
  packageSlug: string;
  packageName: string;
  packageStatus: "baru" | "diperbarui";
  subtests: ImportedSubtestSummary[];
  totalQuestions: number;
  dryRun: boolean;
  // "pembahasan" = file pembahasan saja: soal dan riwayat tidak disentuh.
  mode?: "pembahasan";
  contentHash: string;
  isDuplicateContent: boolean;
  previousUploadAt: string | null;
  hasOverwrite: boolean;
  metadataChanged: boolean;
  requiresConfirmation: boolean;
  warnings: string[];
  spotChecks?: ExplanationSpotCheck[];
}

export class ImportConfirmationRequiredError extends Error {
  readonly summary: ImportSummary;

  constructor(summary: ImportSummary) {
    super("Konfirmasi timpa paksa diperlukan sebelum menyimpan.");
    this.name = "ImportConfirmationRequiredError";
    this.summary = summary;
  }
}

export function formatUploadTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function insertSubtestQuestions(
  client: PoolClient,
  subtestId: number,
  questions: ExistingQuestionSnapshot[],
): Promise<void> {
  for (const question of questions) {
    const optionObjects = question.options.map((label, optionIndex) => ({
      key: OPTION_KEYS[optionIndex],
      label,
    }));
    await client.query(
      `INSERT INTO questions (subtest_id, type, order_index, prompt, image_svg, options, correct_option, explanation, steps, wrong_notes, quick_tip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        subtestId,
        question.type,
        question.orderIndex,
        question.prompt,
        question.imageSvg,
        JSON.stringify(optionObjects),
        OPTION_KEYS[question.correctIndex],
        question.explanation,
        question.steps ? JSON.stringify(question.steps) : null,
        question.wrongNotes ? JSON.stringify(question.wrongNotes) : null,
        question.quickTip,
      ],
    );
  }
}

// Menambah atau memperbarui perusahaan, paket, dan subtes berdasarkan slug.
// Subtes yang identik dilewati agar riwayat jawaban peserta tidak ikut terhapus.
// Dengan dryRun, semua langkah dijalankan lalu dibatalkan, sehingga ringkasannya sama persis dengan impor sungguhan.
export async function importPack(
  pack: PackFile,
  options: { dryRun: boolean; force?: boolean; contentHash?: string },
): Promise<ImportSummary> {
  const contentHash = options.contentHash ?? computeCanonicalHash(pack);
  // Jalankan di luar transaksi agar ketiadaan tabel import_audit_logs (42P01) tidak menggagalkan transaksi utama.
  const previousUpload = await findPreviousSuccessfulUpload(contentHash);

  const { databasePool } = await import("./db");
  const client = await databasePool.connect();
  let transactionClosed = false;

  try {
    await client.query("BEGIN");

    const existingCompany = await client.query<{
      id: number;
      name: string;
      description: string | null;
    }>("SELECT id, name, description FROM companies WHERE slug = $1", [pack.company.slug]);

    const companyResult = await client.query<{ id: number }>(
      `INSERT INTO companies (slug, name, description) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = CASE WHEN $4::boolean THEN EXCLUDED.description ELSE companies.description END
       RETURNING id`,
      [
        pack.company.slug,
        pack.company.name,
        pack.company.description ?? null,
        pack.company.description !== undefined,
      ],
    );
    const companyId = companyResult.rows[0].id;

    const existingPackage = await client.query<{
      id: number;
      name: string;
      description: string | null;
    }>(
      "SELECT id, name, description FROM test_packages WHERE company_id = $1 AND slug = $2",
      [companyId, pack.package.slug],
    );

    const packageResult = await client.query<{ id: number }>(
      `INSERT INTO test_packages (company_id, slug, name, description) VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = CASE WHEN $5::boolean THEN EXCLUDED.description ELSE test_packages.description END
       RETURNING id`,
      [
        companyId,
        pack.package.slug,
        pack.package.name,
        pack.package.description ?? null,
        pack.package.description !== undefined,
      ],
    );
    const packageId = packageResult.rows[0].id;

    const metadataWarnings: string[] = [];
    let metadataChanged = false;
    if (existingCompany.rows.length > 0) {
      const diff = compareContainerMetadata("Perusahaan", existingCompany.rows[0], pack.company);
      if (diff.changed) {
        metadataChanged = true;
        metadataWarnings.push(...diff.warnings);
      }
    }
    if (existingPackage.rows.length > 0) {
      const diff = compareContainerMetadata("Paket", existingPackage.rows[0], pack.package);
      if (diff.changed) {
        metadataChanged = true;
        metadataWarnings.push(...diff.warnings);
      }
    }

    const maxOrderResult = await client.query<{ max_order: number | null }>(
      "SELECT MAX(order_index) AS max_order FROM subtests WHERE test_package_id = $1",
      [packageId],
    );
    let nextOrderIndex = (maxOrderResult.rows[0].max_order ?? 0) + 1;

    const subtestSummaries: ImportedSubtestSummary[] = [];
    let totalQuestions = 0;

    for (const subtest of pack.subtests) {
      const kind: SubtestKind = subtest.kind ?? "QUIZ";
      const durationSeconds = resolveSubtestDuration(kind, subtest.durationSeconds, subtest.config);
      const configObj = subtest.config ?? null;
      const configJson = subtest.config ? JSON.stringify(subtest.config) : null;

      const rawQuestions = Array.isArray(subtest.questions) ? subtest.questions : [];
      const incomingQuestions: ExistingQuestionSnapshot[] = rawQuestions.map((question, index) => ({
        orderIndex: index + 1,
        type: question.type ?? "TEXT",
        prompt: question.prompt,
        imageSvg: question.imageSvg ?? null,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        steps: question.steps ?? null,
        wrongNotes: question.wrongNotes ?? null,
        quickTip: question.quickTip ?? null,
      }));

      const itemCount = countSubtestItems(kind, rawQuestions.length, subtest.config);
      totalQuestions += itemCount;

      const existingSubtest = await client.query<{
        id: number;
        name: string;
        description: string | null;
        duration_seconds: number;
        kind: SubtestKind | null;
        config: unknown | null;
      }>(
        "SELECT id, name, description, duration_seconds, kind, config FROM subtests WHERE test_package_id = $1 AND slug = $2",
        [packageId, subtest.slug],
      );

      if (existingSubtest.rows.length > 0) {
        const existingRow = existingSubtest.rows[0];
        const existingQuestionRows = await client.query<{
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
          `SELECT order_index, type, prompt, image_svg, options, correct_option, explanation, steps, wrong_notes, quick_tip
           FROM questions
           WHERE subtest_id = $1
           ORDER BY order_index`,
          [existingRow.id],
        );

        const existingQuestions: ExistingQuestionSnapshot[] = existingQuestionRows.rows.map((row) => ({
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

        const existingKind: SubtestKind = existingRow.kind ?? "QUIZ";
        const existingSnap: ExistingSubtestSnapshot = {
          name: existingRow.name,
          description: existingRow.description ?? null,
          durationSeconds: existingRow.duration_seconds,
          kind: existingKind,
          config: existingRow.config ?? null,
          questions: existingQuestions,
        };
        const incomingSnap: IncomingSubtestSnapshot = {
          name: subtest.name,
          description: subtest.description ?? null,
          durationSeconds,
          kind,
          config: configObj,
          questions: incomingQuestions,
        };

        const comparison = compareSubtestContent(existingSnap, incomingSnap);
        let replacedAttemptCount = 0;

        if (comparison.changeType === "berubah") {
          const attemptCount = await client.query<{ total: string }>(
            "SELECT COUNT(*) AS total FROM attempts WHERE subtest_id = $1",
            [existingRow.id],
          );
          replacedAttemptCount = Number(attemptCount.rows[0].total);
          await client.query(
            "UPDATE subtests SET name = $1, description = $2, duration_seconds = $3, kind = $4, config = $5 WHERE id = $6",
            [subtest.name, subtest.description ?? null, durationSeconds, kind, configJson, existingRow.id],
          );
          await client.query("DELETE FROM questions WHERE subtest_id = $1", [existingRow.id]);
          await insertSubtestQuestions(client, existingRow.id, incomingQuestions);
        }

        subtestSummaries.push({
          slug: subtest.slug,
          name: subtest.name,
          kind,
          questionCount: itemCount,
          durationSeconds,
          status: "diganti",
          replacedAttemptCount,
          changeType: comparison.changeType,
          existingQuestionCount: countSubtestItems(existingKind, comparison.existingQuestionCount, existingRow.config),
          changedQuestionCount: comparison.changedQuestionCount,
          existingDetailedCount: comparison.existingDetailedCount,
          incomingDetailedCount: comparison.incomingDetailedCount,
          losesDetailedExplanations: comparison.losesDetailedExplanations,
        });
      } else {
        const inserted = await client.query<{ id: number }>(
          `INSERT INTO subtests (test_package_id, slug, name, description, duration_seconds, order_index, kind, config)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [packageId, subtest.slug, subtest.name, subtest.description ?? null, durationSeconds, nextOrderIndex, kind, configJson],
        );
        const subtestId = inserted.rows[0].id;
        nextOrderIndex += 1;

        await insertSubtestQuestions(client, subtestId, incomingQuestions);

        subtestSummaries.push({
          slug: subtest.slug,
          name: subtest.name,
          kind,
          questionCount: itemCount,
          durationSeconds,
          status: "baru",
          replacedAttemptCount: 0,
          changeType: "baru",
          existingQuestionCount: 0,
          changedQuestionCount: incomingQuestions.length,
          existingDetailedCount: 0,
          incomingDetailedCount: kind === "QUIZ" ? incomingQuestions.filter(hasDetailedExplanation).length : 0,
          losesDetailedExplanations: false,
        });
      }
    }

    const allSubtestsIdentical =
      subtestSummaries.length > 0 && subtestSummaries.every((s) => s.changeType === "identik");
    const isDuplicateContent = allSubtestsIdentical && !metadataChanged;
    const hasOverwrite = subtestSummaries.some((s) => s.changeType === "berubah") || metadataChanged;
    const requiresConfirmation = isDuplicateContent || hasOverwrite;

    const warnings: string[] = [];
    if (isDuplicateContent) {
      const prevLabel = previousUpload
        ? ` (terakhir diunggah ${formatUploadTimestamp(previousUpload.createdAt)})`
        : "";
      warnings.push(
        `Isi paket ini identik dengan data di database${prevLabel}. Jika dipaksa impor, subtes identik dilewati sehingga riwayat jawaban peserta tetap aman.`,
      );
    }
    warnings.push(...metadataWarnings);

    const changedSubtests = subtestSummaries.filter((s) => s.changeType === "berubah");
    if (changedSubtests.length > 0) {
      const detail = changedSubtests
        .map((s) =>
          s.changedQuestionCount > 0
            ? `${s.name} (${s.changedQuestionCount} butir berubah)`
            : `${s.name} (metadata/konfigurasi berubah)`,
        )
        .join(", ");
      warnings.push(`Subtes yang sudah ada akan ditimpa: ${detail}.`);
    }

    const totalReplacedAttempts = changedSubtests.reduce((sum, s) => sum + s.replacedAttemptCount, 0);
    if (totalReplacedAttempts > 0) {
      warnings.push(
        `${totalReplacedAttempts} riwayat pengerjaan pada subtes yang berubah akan kehilangan detail jawabannya (skor akhir tetap tersimpan).`,
      );
    }

    for (const sub of changedSubtests) {
      if (sub.losesDetailedExplanations) {
        warnings.push(
          `Subtes "${sub.name}" berisiko kehilangan pembahasan rinci: ${sub.existingDetailedCount} soal di database memiliki pembahasan rinci, sedangkan file baru hanya memuat ${sub.incomingDetailedCount} soal.`,
        );
      }
    }

    const summary: ImportSummary = {
      companySlug: pack.company.slug,
      companyName: pack.company.name,
      companyStatus: existingCompany.rows.length > 0 ? "diperbarui" : "baru",
      packageSlug: pack.package.slug,
      packageName: pack.package.name,
      packageStatus: existingPackage.rows.length > 0 ? "diperbarui" : "baru",
      subtests: subtestSummaries,
      totalQuestions,
      dryRun: options.dryRun,
      contentHash,
      isDuplicateContent,
      previousUploadAt: previousUpload?.createdAt ?? null,
      hasOverwrite,
      metadataChanged,
      requiresConfirmation,
      warnings,
    };

    if (options.dryRun) {
      await client.query("ROLLBACK");
      transactionClosed = true;
      return summary;
    }

    if (requiresConfirmation && !options.force) {
      await client.query("ROLLBACK");
      transactionClosed = true;
      throw new ImportConfirmationRequiredError(summary);
    }

    await client.query("COMMIT");
    transactionClosed = true;
    return summary;
  } catch (error) {
    if (!transactionClosed) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}
