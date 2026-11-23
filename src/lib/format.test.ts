import assert from "node:assert/strict";
import test from "node:test";
import { formatDateTimeId, formatDurationLabel } from "./format";

test("formatDurationLabel memformat detik, menit utuh, dan menit+detik dengan benar", () => {
  assert.equal(formatDurationLabel(0), "0 detik");
  assert.equal(formatDurationLabel(-5), "0 detik");
  assert.equal(formatDurationLabel(45), "45 detik");
  assert.equal(formatDurationLabel(300), "5 menit");
  assert.equal(formatDurationLabel(95), "1 menit 35 dtk");
});

test("formatDateTimeId memformat ISO ke WIB dan mengembalikan input asli bila tanggal invalid", () => {
  const formatted = formatDateTimeId("2026-11-23T08:30:00.000Z");
  assert.match(formatted, /WIB$/);
  assert.match(formatted, /15[.:]30/);
  assert.equal(formatDateTimeId("not-a-date"), "not-a-date");
});
