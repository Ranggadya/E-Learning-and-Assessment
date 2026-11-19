import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

// Token sesi diturunkan dari password/secret, jadi mengganti ADMIN_PASSWORD otomatis mengeluarkan semua sesi lama.
function expectedToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return null;
  }
  const secret = process.env.SESSION_SECRET || password;
  return createHmac("sha256", secret).update("e-assessment-admin-session-v1").digest("hex");
}

function safeEqual(first: string, second: string): boolean {
  // Di-hash dulu agar panjang sama dan perbandingan tetap berwaktu konstan.
  const firstHash = createHash("sha256").update(first).digest();
  const secondHash = createHash("sha256").update(second).digest();
  return timingSafeEqual(firstHash, secondHash);
}

export function verifyPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return false;
  }
  return safeEqual(input, password);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = expectedToken();
  if (!token) {
    return false;
  }
  const cookieStore = await cookies();
  const provided = cookieStore.get(COOKIE_NAME)?.value;
  return provided !== undefined && safeEqual(provided, token);
}

export async function createAdminSession(): Promise<void> {
  const token = expectedToken();
  if (!token) {
    throw new Error("ADMIN_PASSWORD belum diatur");
  }
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Dipakai di awal setiap route admin: mengembalikan respons 401 bila belum login, atau null bila boleh lanjut.
export async function rejectIfNotAdmin(): Promise<NextResponse | null> {
  if (await isAdminAuthenticated()) {
    return null;
  }
  return NextResponse.json({ error: "Belum login sebagai admin" }, { status: 401 });
}
