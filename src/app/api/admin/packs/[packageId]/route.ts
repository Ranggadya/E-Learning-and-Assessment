import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin-auth";
import { deletePackage } from "@/lib/queries";

interface RouteContext {
  params: Promise<{ packageId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }
  const packageId = Number((await context.params).packageId);
  if (!Number.isInteger(packageId)) {
    return NextResponse.json({ error: "ID paket tidak valid" }, { status: 400 });
  }
  const wasDeleted = await deletePackage(packageId);
  return wasDeleted
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });
}
