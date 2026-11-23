import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit-log";
import { sanitizeImportFileName } from "@/lib/import-analysis";

function sanitizeNullableText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function POST(request: Request) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Payload penolakan impor tidak valid." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const mode = payload.mode === "pembahasan" ? "pembahasan" : "pack";
  const companySlug = sanitizeNullableText(payload.companySlug, 160);
  const packageSlug = sanitizeNullableText(payload.packageSlug, 160);
  const targetLabel = sanitizeNullableText(payload.targetLabel, 340);
  const fileName = sanitizeImportFileName(typeof payload.fileName === "string" ? payload.fileName : null);
  const contentHash = sanitizeNullableText(payload.contentHash, 128);
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings
        .filter((item): item is string => typeof item === "string" && item.trim() !== "")
        .map((item) => item.trim().slice(0, 500))
        .slice(0, 20)
    : [];

  await recordAuditLog({
    actionType: "IMPORT_REJECTED",
    status: "REJECTED",
    companySlug,
    packageSlug,
    targetLabel,
    fileName,
    contentHash,
    forcedOverwrite: false,
    summary: { mode, warnings },
  });

  return NextResponse.json({ ok: true });
}
