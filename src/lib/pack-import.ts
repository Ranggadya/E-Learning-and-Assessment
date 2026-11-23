import { formatDateTimeId } from "../components/admin/admin-format";
import { findPreviousSuccessfulUpload } from "./audit-log";
import {
  compareContainerMetadata,
  compareSubtestContent,
  computeCanonicalHash,
  hasDetailedExplanation,
  type ExistingQuestionSnapshot,
  type ExplanationSpotCheck,
  type SubtestChangeType,
  type SubtestSnapshot,
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

export interface ImportDbClient {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
  release(): void;
}

export interface ImportExecutionOptions {
  dryRun: boolean;
  force?: boolean;
  contentHash?: string;
  connectClient?: () => Promise<ImportDbClient>;
  findPreviousUpload?: typeof findPreviousSuccessfulUpload;
}

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

export const formatUploadTimestamp = formatDateTimeId;

function normalizeOptionalDescription(raw: string | undefined): string | null {
  if (raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

async function insertSubtestQuestions(
  client: ImportDbClient,
  subtestId: number,
  questions: ExistingQuestionSnapshot[],
): Promise<void> {
  if (questions.length === 0) {
    return;
  }

  const types: QuestionType[] = [];
  const orderIndices: number[] = [];
  const prompts: string[] = [];
  const imageSvgs: (string | null)[] = [];
  const optionsJson: string[] = [];
  const correctOptions: string[] = [];
  const explanations: string[] = [];
  const stepsJson: (string | null)[] = [];
  const wrongNotesJson: (string | null)[] = [];
  const quickTips: (string | null)[] = [];

  for (const question of questions) {
    const optionObjects = question.options.map((label, optionIndex) => ({
      key: OPTION_KEYS[optionIndex],
      label,
    }));
    types.push(question.type);
    orderIndices.push(question.orderIndex);
    prompts.push(question.prompt);
    imageSvgs.push(question.imageSvg);
    optionsJson.push(JSON.stringify(optionObjects));
    correctOptions.push(OPTION_KEYS[question.correctIndex]);
    explanations.push(question.explanation);
    stepsJson.push(question.steps ? JSON.stringify(question.steps) : null);
    wrongNotesJson.push(question.wrongNotes ? JSON.stringify(question.wrongNotes) : null);
    quickTips.push(question.quickTip);
  }

  await client.query(
    `INSERT INTO questions (
       subtest_id, type, order_index, prompt, image_svg, options,
       correct_option, explanation, steps, wrong_notes, quick_tip
     )
     SELECT $1, u.type, u.order_index, u.prompt, u.image_svg, u.options::jsonb,
            u.correct_option, u.explanation, u.steps::jsonb, u.wrong_notes::jsonb, u.quick_tip
     FROM UNNEST(
       $2::text[], $3::int[], $4::text[], $5::text[], $6::text[],
       $7::text[], $8::text[], $9::text[], $10::text[], $11::text[]
     ) AS u(type, order_index, prompt, image_svg, options, correct_option, explanation, steps, wrong_notes, quick_tip)`,
    [
      subtestId,
      types,
      orderIndices,
      prompts,
      imageSvgs,
      optionsJson,
      correctOptions,
      explanations,
      stepsJson,
      wrongNotesJson,
      quickTips,
    ],
  );
}

interface PlannedSubtestWrite {
  action: SubtestChangeType;
  existingSubtestId: number | null;
  slug: string;
  name: string;
  description: string | null;
  durationSeconds: number;
  kind: SubtestKind;
  configJson: string | null;
  incomingQuestions: ExistingQuestionSnapshot[];
}

// Fase 1 (read-only): analisis diff dan duplikasi tanpa menulis atau mengunci tabel.
// Fase 2 (transaksi): hanya dijalankan saat !dryRun dan konfirmasi terpenuhi; subtes identik dilewati.
export async function importPack(
  pack: PackFile,
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
    const existingCompany = await client.query<{
      id: number;
      name: string;
      description: string | null;
    }>("SELECT id, name, description FROM companies WHERE slug = $1", [pack.company.slug]);
    const existingCompanyRow = existingCompany.rows[0] ?? null;

    const existingPackageRow = existingCompanyRow
      ? (
          await client.query<{
            id: number;
            name: string;
            description: string | null;
          }>("SELECT id, name, description FROM test_packages WHERE company_id = $1 AND slug = $2", [
            existingCompanyRow.id,
            pack.package.slug,
          ])
        ).rows[0] ?? null
      : null;

    const metadataWarnings: string[] = [];
    let metadataChanged = false;
    if (existingCompanyRow) {
      const diff = compareContainerMetadata("Perusahaan", existingCompanyRow, pack.company);
      if (diff.changed) {
        metadataChanged = true;
        metadataWarnings.push(...diff.warnings);
      }
    }
    if (existingPackageRow) {
      const diff = compareContainerMetadata("Paket", existingPackageRow, pack.package);
      if (diff.changed) {
        metadataChanged = true;
        metadataWarnings.push(...diff.warnings);
      }
    }

    const subtestSummaries: ImportedSubtestSummary[] = [];
    const plannedWrites: PlannedSubtestWrite[] = [];
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

      const existingSubtestRow = existingPackageRow
        ? (
            await client.query<{
              id: number;
              name: string;
              description: string | null;
              duration_seconds: number;
              kind: SubtestKind | null;
              config: unknown | null;
            }>(
              "SELECT id, name, description, duration_seconds, kind, config FROM subtests WHERE test_package_id = $1 AND slug = $2",
              [existingPackageRow.id, subtest.slug],
            )
          ).rows[0] ?? null
        : null;

      if (existingSubtestRow) {
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
          [existingSubtestRow.id],
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

        const existingKind: SubtestKind = existingSubtestRow.kind ?? "QUIZ";
        const existingSnap: SubtestSnapshot = {
          name: existingSubtestRow.name,
          description: existingSubtestRow.description ?? null,
          durationSeconds: existingSubtestRow.duration_seconds,
          kind: existingKind,
          config: existingSubtestRow.config ?? null,
          questions: existingQuestions,
        };
        const incomingSnap: SubtestSnapshot = {
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
            [existingSubtestRow.id],
          );
          replacedAttemptCount = Number(attemptCount.rows[0].total);
        }

        plannedWrites.push({
          action: comparison.changeType,
          existingSubtestId: existingSubtestRow.id,
          slug: subtest.slug,
          name: subtest.name,
          description: subtest.description ?? null,
          durationSeconds,
          kind,
          configJson,
          incomingQuestions,
        });

        subtestSummaries.push({
          slug: subtest.slug,
          name: subtest.name,
          kind,
          questionCount: itemCount,
          durationSeconds,
          status: "diganti",
          replacedAttemptCount,
          changeType: comparison.changeType,
          existingQuestionCount: countSubtestItems(
            existingKind,
            comparison.existingQuestionCount,
            existingSubtestRow.config,
          ),
          changedQuestionCount: comparison.changedQuestionCount,
          existingDetailedCount: comparison.existingDetailedCount,
          incomingDetailedCount: comparison.incomingDetailedCount,
          losesDetailedExplanations: comparison.losesDetailedExplanations,
        });
      } else {
        plannedWrites.push({
          action: "baru",
          existingSubtestId: null,
          slug: subtest.slug,
          name: subtest.name,
          description: subtest.description ?? null,
          durationSeconds,
          kind,
          configJson,
          incomingQuestions,
        });

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
      companyStatus: existingCompanyRow ? "diperbarui" : "baru",
      packageSlug: pack.package.slug,
      packageName: pack.package.name,
      packageStatus: existingPackageRow ? "diperbarui" : "baru",
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
      return summary;
    }

    if (requiresConfirmation && !options.force) {
      throw new ImportConfirmationRequiredError(summary);
    }

    const hasWritableChanges =
      !existingCompanyRow ||
      !existingPackageRow ||
      metadataChanged ||
      plannedWrites.some((item) => item.action !== "identik");

    if (!hasWritableChanges) {
      return summary;
    }

    await client.query("BEGIN");
    inTransaction = true;

    const companyResult = await client.query<{ id: number }>(
      `INSERT INTO companies (slug, name, description) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = CASE WHEN $4::boolean THEN EXCLUDED.description ELSE companies.description END
       RETURNING id`,
      [
        pack.company.slug,
        pack.company.name,
        normalizeOptionalDescription(pack.company.description),
        pack.company.description !== undefined,
      ],
    );
    const companyId = companyResult.rows[0].id;

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
        normalizeOptionalDescription(pack.package.description),
        pack.package.description !== undefined,
      ],
    );
    const packageId = packageResult.rows[0].id;

    const hasNewSubtests = plannedWrites.some((item) => item.action === "baru");
    let nextOrderIndex = 1;
    if (hasNewSubtests) {
      const maxOrderResult = await client.query<{ max_order: number | null }>(
        "SELECT MAX(order_index) AS max_order FROM subtests WHERE test_package_id = $1",
        [packageId],
      );
      nextOrderIndex = (maxOrderResult.rows[0]?.max_order ?? 0) + 1;
    }

    for (const item of plannedWrites) {
      if (item.action === "identik") {
        continue;
      }
      if (item.action === "berubah" && item.existingSubtestId !== null) {
        await client.query(
          "UPDATE subtests SET name = $1, description = $2, duration_seconds = $3, kind = $4, config = $5 WHERE id = $6",
          [item.name, item.description, item.durationSeconds, item.kind, item.configJson, item.existingSubtestId],
        );
        await client.query("DELETE FROM questions WHERE subtest_id = $1", [item.existingSubtestId]);
        await insertSubtestQuestions(client, item.existingSubtestId, item.incomingQuestions);
      } else {
        const inserted = await client.query<{ id: number }>(
          `INSERT INTO subtests (test_package_id, slug, name, description, duration_seconds, order_index, kind, config)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [
            packageId,
            item.slug,
            item.name,
            item.description,
            item.durationSeconds,
            nextOrderIndex,
            item.kind,
            item.configJson,
          ],
        );
        nextOrderIndex += 1;
        await insertSubtestQuestions(client, inserted.rows[0].id, item.incomingQuestions);
      }
    }

    await client.query("COMMIT");
    inTransaction = false;
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
