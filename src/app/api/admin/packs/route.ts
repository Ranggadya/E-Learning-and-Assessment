import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit-log";
import {
  ExplanationImportError,
  importExplanations,
  isExplanationPack,
  validateExplanationPack,
} from "@/lib/explanation-pack";
import {
  extractParsedMetadata,
  resolveAuditActionType,
  sanitizeImportFileName,
} from "@/lib/import-analysis";
import {
  ImportConfirmationRequiredError,
  importPack,
  type ImportSummary,
} from "@/lib/pack-import";
import { validatePack } from "@/lib/pack-schema";

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const CONFIRMATION_REQUIRED_MESSAGE = "Konfirmasi timpa paksa diperlukan sebelum menyimpan.";

// POST /api/admin/packs?dryRun=1&force=1 memeriksa atau menyimpan paket soal / pembahasan.
export async function POST(request: Request) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const force = url.searchParams.get("force") === "1";
  const fileName = sanitizeImportFileName(request.headers.get("x-import-filename"));

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const rawBody = contentLength > MAX_BODY_BYTES ? null : await request.text();
  if (rawBody === null || Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    const errors = ["File terlalu besar (maksimal 8 MB)"];
    if (!dryRun) {
      await recordAuditLog({
        actionType: "IMPORT_FAILED",
        status: "FAILED",
        fileName,
        summary: { errors },
      });
    }
    return NextResponse.json({ errors }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "format tidak dikenali";
    const errors = [`Bukan JSON yang valid: ${reason}`];
    if (!dryRun) {
      await recordAuditLog({
        actionType: "IMPORT_FAILED",
        status: "FAILED",
        fileName,
        summary: { errors },
      });
    }
    return NextResponse.json({ errors }, { status: 400 });
  }

  const meta = extractParsedMetadata(parsed);

  async function logFailure(mode: "pack" | "pembahasan", errors: string[]) {
    if (dryRun) {
      return;
    }
    await recordAuditLog({
      actionType: "IMPORT_FAILED",
      status: "FAILED",
      companySlug: meta.companySlug,
      packageSlug: meta.packageSlug,
      targetLabel: meta.targetLabel,
      fileName,
      contentHash: meta.contentHash,
      summary: { mode, errors: errors.slice(0, 10) },
    });
  }

  async function runAndRespond(mode: "pack" | "pembahasan", executor: () => Promise<ImportSummary>) {
    try {
      const summary = await executor();
      if (!dryRun) {
        const forcedOverwrite = summary.requiresConfirmation && force;
        const replacedAttempts = summary.subtests.reduce(
          (total, subtest) => total + subtest.replacedAttemptCount,
          0,
        );
        await recordAuditLog({
          actionType: resolveAuditActionType(summary),
          status: forcedOverwrite ? "FORCED" : "SUCCESS",
          companySlug: summary.companySlug,
          packageSlug: summary.packageSlug,
          targetLabel: `${summary.companyName} / ${summary.packageName}`,
          fileName,
          contentHash: summary.contentHash,
          forcedOverwrite,
          summary: {
            mode: summary.mode ?? "pack",
            subtestCount: summary.subtests.length,
            totalQuestions: summary.totalQuestions,
            replacedAttempts,
            warnings: summary.warnings,
          },
        });
      }
      return NextResponse.json({ summary });
    } catch (error) {
      if (error instanceof ImportConfirmationRequiredError) {
        return NextResponse.json(
          {
            requiresConfirmation: true,
            summary: error.summary,
            errors: [CONFIRMATION_REQUIRED_MESSAGE],
          },
          { status: 409 },
        );
      }
      if (error instanceof ExplanationImportError) {
        await logFailure(mode, error.problems);
        return NextResponse.json({ errors: error.problems }, { status: 400 });
      }
      console.error(mode === "pembahasan" ? "Impor pembahasan gagal" : "Impor paket gagal", error);
      const errors = ["Impor gagal di database. Tidak ada data yang berubah."];
      await logFailure(mode, errors);
      return NextResponse.json({ errors }, { status: 500 });
    }
  }

  // File pembahasan saja (pembahasanSaja: true) hanya memperbarui pembahasan soal yang sudah ada.
  if (isExplanationPack(parsed)) {
    const explanationValidation = validateExplanationPack(parsed);
    if (!explanationValidation.ok) {
      await logFailure("pembahasan", explanationValidation.errors);
      return NextResponse.json({ errors: explanationValidation.errors }, { status: 400 });
    }
    return runAndRespond("pembahasan", () =>
      importExplanations(explanationValidation.pack, {
        dryRun,
        force,
        contentHash: meta.contentHash,
      }),
    );
  }

  const validation = validatePack(parsed);
  if (!validation.ok) {
    await logFailure("pack", validation.errors);
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  return runAndRespond("pack", () =>
    importPack(validation.pack, {
      dryRun,
      force,
      contentHash: meta.contentHash,
    }),
  );
}
