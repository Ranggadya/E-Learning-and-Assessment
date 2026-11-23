import { NextResponse } from "next/server";
import { isValidAnonUserId } from "@/lib/english/logic";
import { getStudyQueue, recordFlashcardReview } from "@/lib/english/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!isValidAnonUserId(userId)) {
    return NextResponse.json({ error: "userId tidak valid" }, { status: 400 });
  }
  const cefr = url.searchParams.get("cefr") ?? undefined;
  const newLimitRaw = Number(url.searchParams.get("newLimit") ?? 10);
  const newLimit = Number.isFinite(newLimitRaw) ? newLimitRaw : 10;

  const queue = await getStudyQueue({ userId, cefr, newLimit });
  return NextResponse.json(queue);
}

export async function POST(request: Request) {
  let body: { userId?: unknown; wordId?: unknown; known?: unknown };
  try {
    body = (await request.json()) as { userId?: unknown; wordId?: unknown; known?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON tidak valid" }, { status: 400 });
  }

  if (!isValidAnonUserId(body.userId)) {
    return NextResponse.json({ error: "userId tidak valid" }, { status: 400 });
  }
  const wordId = Number(body.wordId);
  if (!Number.isInteger(wordId) || wordId < 1) {
    return NextResponse.json({ error: "wordId tidak valid" }, { status: 400 });
  }
  if (typeof body.known !== "boolean") {
    return NextResponse.json({ error: "known harus boolean" }, { status: 400 });
  }

  const result = await recordFlashcardReview({
    userId: body.userId,
    wordId,
    known: body.known,
  });
  return NextResponse.json(result);
}
