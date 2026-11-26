import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin/auth";
import { deleteLessonById, updateLessonStatus } from "@/lib/belajar/belajar.queries";
import { BELAJAR_CACHE_TAG } from "@/lib/belajar/constants";
import type { LessonStatus } from "@/types/belajar";

interface RouteContext {
  params: Promise<{ lessonId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) return rejection;

  const { lessonId: rawId } = await context.params;
  const lessonId = Number(rawId);
  if (!Number.isInteger(lessonId) || lessonId < 1) {
    return NextResponse.json({ error: "ID pelajaran tidak valid." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  if (!body || (body.status !== "draft" && body.status !== "reviewed")) {
    return NextResponse.json({ error: "Status harus draft atau reviewed." }, { status: 400 });
  }

  const updated = await updateLessonStatus(lessonId, body.status as LessonStatus);
  if (!updated) {
    return NextResponse.json({ error: "Pelajaran tidak ditemukan." }, { status: 404 });
  }

  revalidateTag(BELAJAR_CACHE_TAG, { expire: 0 });
  revalidatePath("/belajar", "layout");
  return NextResponse.json({ updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) return rejection;

  const { lessonId: rawId } = await context.params;
  const lessonId = Number(rawId);
  if (!Number.isInteger(lessonId) || lessonId < 1) {
    return NextResponse.json({ error: "ID pelajaran tidak valid." }, { status: 400 });
  }

  const deleted = await deleteLessonById(lessonId);
  if (!deleted) {
    return NextResponse.json({ error: "Pelajaran tidak ditemukan." }, { status: 404 });
  }

  revalidateTag(BELAJAR_CACHE_TAG, { expire: 0 });
  revalidatePath("/belajar", "layout");
  return NextResponse.json({ ok: true });
}
