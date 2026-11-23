import { NextResponse } from "next/server";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  createAdminSession,
  isAdminConfigured,
  recordLoginFailure,
  verifyPassword,
} from "@/lib/admin/auth";

const FAILED_LOGIN_DELAY_MILLISECONDS = 800;

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
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "ADMIN_PASSWORD belum diatur di server" }, { status: 503 });
  }

  const clientIp = extractClientIp(request);
  const rateLimit = checkLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan login gagal. Coba lagi dalam 1 menit." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body: unknown = await request.json().catch(function onInvalidJson() {
    return null;
  });
  const password =
    typeof body === "object" && body !== null && "password" in body && typeof body.password === "string"
      ? body.password
      : "";

  if (!verifyPassword(password)) {
    recordLoginFailure(clientIp);
    // Jeda kecil memperlambat tebak-tebakan password.
    await new Promise(function wait(resolve) {
      setTimeout(resolve, FAILED_LOGIN_DELAY_MILLISECONDS);
    });
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }
  clearLoginFailures(clientIp);
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
