import { NextResponse } from "next/server";
import { generateEnglishQuiz } from "@/lib/english/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cefr = url.searchParams.get("cefr") ?? undefined;
  const questions = await generateEnglishQuiz({ cefr, count: 10 });
  return NextResponse.json({ questions });
}
