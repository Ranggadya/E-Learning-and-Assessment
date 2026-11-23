import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit-log";
import { parsePgInt4Id, validatePackageUpdateInput } from "@/lib/import-analysis";
import { deletePackage, updatePackageMetadata } from "@/lib/queries";

interface RouteContext {
  params: Promise<{ packageId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  const packageId = parsePgInt4Id((await context.params).packageId);
  if (packageId === null) {
    return NextResponse.json({ error: "ID paket tidak valid" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const validation = validatePackageUpdateInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const updated = await updatePackageMetadata(packageId, validation.data);
  if (!updated) {
    return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });
  }

  await recordAuditLog({
    actionType: "PACKAGE_UPDATED",
    status: "SUCCESS",
    companySlug: updated.companySlug,
    packageSlug: updated.packageSlug,
    targetLabel: updated.after.name,
    summary: { before: updated.before, after: updated.after },
  });

  return NextResponse.json({ ok: true, package: { id: packageId, ...updated.after } });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  const packageId = parsePgInt4Id((await context.params).packageId);
  if (packageId === null) {
    return NextResponse.json({ error: "ID paket tidak valid" }, { status: 400 });
  }

  const deleted = await deletePackage(packageId);
  if (!deleted) {
    return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });
  }

  await recordAuditLog({
    actionType: "PACKAGE_DELETED",
    status: "SUCCESS",
    companySlug: deleted.companySlug,
    packageSlug: deleted.packageSlug,
    targetLabel: `${deleted.companyName} / ${deleted.packageName}`,
    summary: { companyName: deleted.companyName, packageName: deleted.packageName },
  });

  return NextResponse.json({ ok: true });
}
