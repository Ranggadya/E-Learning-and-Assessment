import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { gradeLessonQuiz } from "@/lib/belajar/belajar.queries";
import { isValidAnonUserId } from "@/lib/english/logic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userKey?: unknown;
    lessonId?: unknown;
    lessonSlug?: unknown;
    answers?: unknown;
  } | null;

  if (
    !body ||
    !isValidAnonUserId(body.userKey) ||
    !Number.isInteger(body.lessonId) ||
    typeof body.lessonSlug !== "string" ||
    !Array.isArray(body.answers)
  ) {
    return NextResponse.json({ error: "Payload kuis tidak valid." }, { status: 400 });
  }

  const cleanAnswers = body.answers
    .filter(
      (a): a is { questionId: number; selectedOption: string | null } =>
        Boolean(a) &&
        typeof a === "object" &&
        Number.isInteger((a as Record<string, unknown>).questionId) &&
        ((a as Record<string, unknown>).selectedOption === null ||
          typeof (a as Record<string, unknown>).selectedOption === "string"),
    );

  const graded = await gradeLessonQuiz({
    userKey: body.userKey,
    lessonId: body.lessonId as number,
    lessonSlug: body.lessonSlug.trim(),
    answers: cleanAnswers,
  });

  if (!graded) {
    return NextResponse.json({ error: "Soal kuis belum tersedia untuk pelajaran ini." }, { status: 404 });
  }

  revalidatePath("/belajar", "layout");
  return NextResponse.json(graded);
}
