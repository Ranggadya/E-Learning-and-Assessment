import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { upsertLessonProgress } from "@/lib/belajar/belajar.queries";
import { isValidAnonUserId } from "@/lib/english/logic";
import type { LessonProgressStatus } from "@/types/belajar";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userKey?: unknown;
    lessonId?: unknown;
    status?: unknown;
  } | null;

  if (!body || !isValidAnonUserId(body.userKey)) {
    return NextResponse.json({ error: "userKey tidak valid." }, { status: 400 });
  }
  const lessonId = Number(body.lessonId);
  const status = body.status;
  if (!Number.isInteger(lessonId) || lessonId < 1 || (status !== "started" && status !== "done")) {
    return NextResponse.json({ error: "Parameter progres tidak valid." }, { status: 400 });
  }

  const ok = await upsertLessonProgress({
    userKey: body.userKey,
    lessonId,
    status: status as LessonProgressStatus,
  });
  if (!ok) {
    return NextResponse.json({ error: "Pelajaran tidak ditemukan." }, { status: 404 });
  }

  revalidatePath("/belajar", "layout");
  return NextResponse.json({ ok: true, status });
}
