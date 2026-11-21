import { NextResponse } from "next/server";
import { submitAttempt, submitNonQuizAttempt } from "@/lib/queries";
import type { SubmitAttemptInput, SubmitNonQuizInput } from "@/lib/types";

function isValidQuizPayload(value: unknown): value is SubmitAttemptInput {
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

function isValidNonQuizPayload(value: unknown): value is SubmitNonQuizInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (!Number.isInteger(candidate.subtestId)) {
    return false;
  }
  if (candidate.kind === "PERSONALITY") {
    return (
      Array.isArray(candidate.ratings) &&
      candidate.ratings.every(
        (r) => r === null || (Number.isInteger(r) && (r as number) >= 1 && (r as number) <= 5),
      )
    );
  }
  if (candidate.kind === "PAULI") {
    return (
      Array.isArray(candidate.perColumn) &&
      candidate.perColumn.length <= 100 &&
      candidate.perColumn.every(
        (col) =>
          typeof col === "object" &&
          col !== null &&
          Number.isInteger((col as Record<string, unknown>).column) &&
          Number.isInteger((col as Record<string, unknown>).answered) &&
          ((col as Record<string, unknown>).answered as number) >= 0 &&
          Number.isInteger((col as Record<string, unknown>).correct) &&
          ((col as Record<string, unknown>).correct as number) >= 0,
      )
    );
  }
  if (candidate.kind === "DRAWING") {
    return (
      Array.isArray(candidate.drawings) &&
      candidate.drawings.length <= 10 &&
      candidate.drawings.every(
        (d) =>
          typeof d === "object" &&
          d !== null &&
          typeof (d as Record<string, unknown>).key === "string" &&
          typeof (d as Record<string, unknown>).title === "string" &&
          typeof (d as Record<string, unknown>).instruction === "string" &&
          typeof (d as Record<string, unknown>).dataUrl === "string" &&
          ((d as Record<string, unknown>).dataUrl as string).length <= 300 * 1024 &&
          (((d as Record<string, unknown>).dataUrl as string) === "" ||
            ((d as Record<string, unknown>).dataUrl as string).startsWith("data:image/png;base64,")),
      )
    );
  }
  return false;
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(function onInvalidJson() {
    return null;
  });
  if (isValidQuizPayload(body)) {
    const attemptId = await submitAttempt(body);
    return NextResponse.json({ attemptId });
  }
  if (isValidNonQuizPayload(body)) {
    const attemptId = await submitNonQuizAttempt(body);
    if (attemptId === null) {
      return NextResponse.json({ error: "Subtes tidak ditemukan atau jenis tidak sesuai" }, { status: 400 });
    }
    return NextResponse.json({ attemptId });
  }
  return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
}
