import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin-auth";
import { deleteSubtest } from "@/lib/queries";

interface RouteContext {
  params: Promise<{ subtestId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }
  const subtestId = Number((await context.params).subtestId);
  if (!Number.isInteger(subtestId)) {
    return NextResponse.json({ error: "ID subtes tidak valid" }, { status: 400 });
  }
  const wasDeleted = await deleteSubtest(subtestId);
  return wasDeleted
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Subtes tidak ditemukan" }, { status: 404 });
}
