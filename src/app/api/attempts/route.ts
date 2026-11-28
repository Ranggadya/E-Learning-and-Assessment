import { NextResponse } from "next/server";
import { submitAttempt, submitNonQuizAttempt } from "@/lib/assessment/attempt.queries";
import {
  checkAttemptRateLimit,
  isValidNonQuizPayload,
  isValidQuizPayload,
} from "@/lib/assessment/scoring";

function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}

export async function POST(request: Request) {
  const rateLimit = checkAttemptRateLimit(extractClientIp(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak pengiriman jawaban dalam waktu singkat. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body: unknown = await request.json().catch(function onInvalidJson() {
    return null;
  });

  if (isValidQuizPayload(body)) {
    const attemptId = await submitAttempt(body);
    if (attemptId === null) {
      return NextResponse.json(
        { error: "Subtes tidak ditemukan atau jenis tidak sesuai" },
        { status: 400 },
      );
    }
    return NextResponse.json({ attemptId });
  }

  if (isValidNonQuizPayload(body)) {
    const attemptId = await submitNonQuizAttempt(body);
    if (attemptId === null) {
      return NextResponse.json(
        { error: "Subtes tidak ditemukan atau jenis tidak sesuai" },
        { status: 400 },
      );
    }
    return NextResponse.json({ attemptId });
  }

  return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
}
