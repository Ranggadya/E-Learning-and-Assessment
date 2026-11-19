import { NextResponse } from "next/server";
import { createAdminSession, isAdminConfigured, verifyPassword } from "@/lib/admin-auth";

const FAILED_LOGIN_DELAY_MILLISECONDS = 800;

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "ADMIN_PASSWORD belum diatur di server" }, { status: 503 });
  }
  const body: unknown = await request.json().catch(function onInvalidJson() {
    return null;
  });
  const password =
    typeof body === "object" && body !== null && "password" in body && typeof body.password === "string"
      ? body.password
      : "";

  if (!verifyPassword(password)) {
    // Jeda kecil memperlambat tebak-tebakan password.
    await new Promise(function wait(resolve) {
      setTimeout(resolve, FAILED_LOGIN_DELAY_MILLISECONDS);
    });
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
