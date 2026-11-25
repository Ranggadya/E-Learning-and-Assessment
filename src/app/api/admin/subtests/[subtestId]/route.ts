import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin/auth";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { parsePgInt4Id, validateSubtestUpdateInput } from "@/lib/admin/import-analysis";
import { deleteSubtest, updateSubtestMetadata } from "@/lib/admin/queries";
import { CATALOG_CACHE_TAG } from "@/lib/assessment/catalog.queries";

interface RouteContext {
  params: Promise<{ subtestId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  const subtestId = parsePgInt4Id((await context.params).subtestId);
  if (subtestId === null) {
    return NextResponse.json({ error: "ID subtes tidak valid" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const result = await updateSubtestMetadata(subtestId, (kind, currentDurationSeconds) =>
    validateSubtestUpdateInput(body, kind, currentDurationSeconds),
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { updated } = result;
  await recordAuditLog({
    actionType: "SUBTEST_UPDATED",
    status: "SUCCESS",
    companySlug: updated.companySlug,
    packageSlug: updated.packageSlug,
    targetLabel: `${updated.packageName} / ${updated.after.name}`,
    summary: {
      subtestSlug: updated.subtestSlug,
      kind: updated.kind,
      before: updated.before,
      after: updated.after,
    },
  });
  revalidateTag(CATALOG_CACHE_TAG, { expire: 0 });
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, subtest: { id: subtestId, ...updated.after } });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  const subtestId = parsePgInt4Id((await context.params).subtestId);
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
  revalidateTag(CATALOG_CACHE_TAG, { expire: 0 });
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true });
}
