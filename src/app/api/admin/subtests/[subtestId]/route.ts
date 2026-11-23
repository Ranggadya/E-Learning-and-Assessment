import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit-log";
import { validateSubtestUpdateInput } from "@/lib/import-analysis";
import { deleteSubtest, getSubtestForEdit, updateSubtestMetadata } from "@/lib/queries";

interface RouteContext {
  params: Promise<{ subtestId: string }>;
}

function parseSubtestId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  const subtestId = parseSubtestId((await context.params).subtestId);
  if (subtestId === null) {
    return NextResponse.json({ error: "ID subtes tidak valid" }, { status: 400 });
  }

  const existing = await getSubtestForEdit(subtestId);
  if (!existing) {
    return NextResponse.json({ error: "Subtes tidak ditemukan" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const validation = validateSubtestUpdateInput(body, existing.kind, existing.durationSeconds);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const wasUpdated = await updateSubtestMetadata(subtestId, validation.data);
  if (!wasUpdated) {
    return NextResponse.json({ error: "Subtes tidak ditemukan" }, { status: 404 });
  }

  await recordAuditLog({
    actionType: "SUBTEST_UPDATED",
    status: "SUCCESS",
    companySlug: existing.companySlug,
    packageSlug: existing.packageSlug,
    targetLabel: `${existing.packageName} / ${validation.data.name}`,
    summary: {
      subtestSlug: existing.slug,
      kind: existing.kind,
      before: { name: existing.name, durationSeconds: existing.durationSeconds },
      after: validation.data,
    },
  });

  return NextResponse.json({ ok: true, subtest: { id: subtestId, ...validation.data } });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  const subtestId = parseSubtestId((await context.params).subtestId);
  if (subtestId === null) {
    return NextResponse.json({ error: "ID subtes tidak valid" }, { status: 400 });
  }

  const deleted = await deleteSubtest(subtestId);
  if (!deleted) {
    return NextResponse.json({ error: "Subtes tidak ditemukan" }, { status: 404 });
  }

  await recordAuditLog({
    actionType: "SUBTEST_DELETED",
    status: "SUCCESS",
    companySlug: deleted.companySlug,
    packageSlug: deleted.packageSlug,
    targetLabel: `${deleted.packageName} / ${deleted.subtestName}`,
    summary: { subtestSlug: deleted.subtestSlug, subtestName: deleted.subtestName },
  });

  return NextResponse.json({ ok: true });
}
