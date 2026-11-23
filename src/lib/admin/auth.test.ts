import assert from "node:assert/strict";
import test from "node:test";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure } from "./auth";

test("rate limit login admin memblokir setelah 5 percobaan gagal per IP dan terbuka kembali setelah reset/window habis", () => {
  const ip = "203.0.113.42";
  clearLoginFailures(ip);
  const t0 = 1_700_000_000_000;

  for (let i = 0; i < 4; i += 1) {
    recordLoginFailure(ip, t0 + i * 100);
    assert.equal(checkLoginRateLimit(ip, t0 + 500).allowed, true);
  }
  recordLoginFailure(ip, t0 + 600);
  const blocked = checkLoginRateLimit(ip, t0 + 1000);
  assert.equal(blocked.allowed, false);
  if (!blocked.allowed) {
    assert.equal(blocked.retryAfterSeconds, 59);
  }

  // Setelah 60 detik berlalu, otomatis diizinkan kembali
  assert.equal(checkLoginRateLimit(ip, t0 + 60_001).allowed, true);

  // clearLoginFailures langsung membuka blokir
  for (let i = 0; i < 5; i += 1) {
    recordLoginFailure(ip, t0 + 70_000);
  }
  assert.equal(checkLoginRateLimit(ip, t0 + 70_100).allowed, false);
  clearLoginFailures(ip);
  assert.equal(checkLoginRateLimit(ip, t0 + 70_100).allowed, true);
});
