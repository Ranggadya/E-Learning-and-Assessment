import { NextResponse } from "next/server";
import { submitAttempt } from "@/lib/queries";
import type { SubmitAttemptInput } from "@/lib/types";

function isValidPayload(value: unknown): value is SubmitAttemptInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<SubmitAttemptInput>;
  return (
    Number.isInteger(candidate.subtestId) &&
    Array.isArray(candidate.answers) &&
    candidate.answers.every(function isValidAnswer(answer) {
      return (
        Number.isInteger(answer.questionId) &&
        (answer.selectedOption === null || typeof answer.selectedOption === "string")
      );
    })
  );
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(function onInvalidJson() {
    return null;
  });
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }
  const attemptId = await submitAttempt(body);
  return NextResponse.json({ attemptId });
}
