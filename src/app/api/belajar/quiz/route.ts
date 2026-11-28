import { NextResponse } from "next/server";
import { gradeLessonQuiz } from "@/lib/belajar/belajar.queries";
import { isValidAnonUserId } from "@/lib/english/logic";
import { parsePgInt4Id } from "@/lib/format";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userKey?: unknown;
    lessonId?: unknown;
    lessonSlug?: unknown;
    answers?: unknown;
  } | null;

  const lessonId = body ? parsePgInt4Id(body.lessonId) : null;
  if (
    !body ||
    !isValidAnonUserId(body.userKey) ||
    lessonId === null ||
    typeof body.lessonSlug !== "string" ||
    !Array.isArray(body.answers) ||
    body.answers.length > 50
  ) {
    return NextResponse.json({ error: "Payload kuis tidak valid." }, { status: 400 });
  }

  const cleanAnswers = body.answers.filter(
    (a): a is { questionId: number; selectedOption: string | null } =>
      Boolean(a) &&
      typeof a === "object" &&
      parsePgInt4Id((a as Record<string, unknown>).questionId) !== null &&
      typeof (a as Record<string, unknown>).questionId === "number" &&
      ((a as Record<string, unknown>).selectedOption === null ||
        (typeof (a as Record<string, unknown>).selectedOption === "string" &&
          ((a as Record<string, unknown>).selectedOption as string).length <= 16)),
  );

  const graded = await gradeLessonQuiz({
    userKey: body.userKey,
    lessonId,
    lessonSlug: body.lessonSlug.trim(),
    answers: cleanAnswers,
  });

  if (!graded) {
    return NextResponse.json(
      { error: "Soal kuis belum tersedia untuk pelajaran ini." },
      { status: 404 },
    );
  }

  return NextResponse.json(graded);
}
