import { NextResponse } from "next/server";
import { parseEnglishQuizProgressPayload } from "@/lib/english/logic";
import { recordEnglishQuizProgress } from "@/lib/english/queries";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON tidak valid" }, { status: 400 });
  }

  const parsed = parseEnglishQuizProgressPayload(body);
  if (!parsed) {
    return NextResponse.json({ error: "Payload progres kuis tidak valid" }, { status: 400 });
  }

  const result = await recordEnglishQuizProgress(parsed.userId, parsed.results);
  return NextResponse.json(result);
}
