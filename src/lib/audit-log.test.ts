import assert from "node:assert/strict";
import test from "node:test";
import {
  findPreviousSuccessfulUpload,
  isUndefinedTableError,
  listAuditLogs,
  recordAuditLog,
  type QueryExecutor,
} from "./audit-log";

function makePgError(code: string, message = "pg error"): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

test("isUndefinedTableError hanya bernilai true untuk PostgreSQL error code 42P01", () => {
  assert.equal(isUndefinedTableError({ code: "42P01" }), true);
  assert.equal(isUndefinedTableError(makePgError("42P01")), true);
  assert.equal(isUndefinedTableError({ code: "23505" }), false);
  assert.equal(isUndefinedTableError(null), false);
  assert.equal(isUndefinedTableError(undefined), false);
  assert.equal(isUndefinedTableError("42P01"), false);
  assert.equal(isUndefinedTableError(new Error("x")), false);
});

test("recordAuditLog mengirim INSERT berparameter dengan default field nullable dan serialisasi summary", async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const queryFn: QueryExecutor = async (text, values) => {
    calls.push({ text, values });
    return { rows: [] };
  };

  await recordAuditLog(
    {
      actionType: "PACK_NEW",
      status: "SUCCESS",
      summary: { subtestCount: 3, questionCount: 45 },
    },
    queryFn,
  );

  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /INSERT INTO import_audit_logs/i);
  assert.deepEqual(calls[0].values, [
    "PACK_NEW",
    "SUCCESS",
    null,
    null,
    null,
    null,
    null,
    false,
    JSON.stringify({ subtestCount: 3, questionCount: 45 }),
  ]);
});

test("recordAuditLog fail-safe saat tabel belum ada (42P01) atau error DB lain tanpa melempar exception", async () => {
  const origWarn = console.warn;
  const origError = console.error;
  const warnings: unknown[][] = [];
  const errors: unknown[][] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };

  try {
    const missingTableQuery: QueryExecutor = async () => {
      throw makePgError("42P01", 'relation "import_audit_logs" does not exist');
    };
    await recordAuditLog({ actionType: "PACKAGE_UPDATED", status: "SUCCESS" }, missingTableQuery);
    assert.equal(warnings.length, 1);

    const otherErrorQuery: QueryExecutor = async () => {
      throw makePgError("08006", "connection failure");
    };
    await recordAuditLog({ actionType: "PACKAGE_DELETED", status: "SUCCESS" }, otherErrorQuery);
    assert.equal(errors.length, 1);
  } finally {
    console.warn = origWarn;
    console.error = origError;
  }
});

test("findPreviousSuccessfulUpload memetakan hasil, menangani kosong, dan fail-safe saat 42P01", async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const hitQuery: QueryExecutor = async (text, values) => {
    calls.push({ text, values });
    return {
      rows: [{ created_at: new Date("2026-11-22T10:00:00Z"), file_name: "astra.json" }],
    };
  };

  const hit = await findPreviousSuccessfulUpload("abc123", hitQuery);
  assert.deepEqual(hit, { createdAt: "2026-11-22T10:00:00.000Z", fileName: "astra.json" });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, ["abc123"]);
  assert.match(calls[0].text, /status IN \('SUCCESS', 'FORCED'\)/i);

  const emptyQuery: QueryExecutor = async () => ({ rows: [] });
  assert.equal(await findPreviousSuccessfulUpload("abc123", emptyQuery), null);

  const missingTableQuery: QueryExecutor = async () => {
    throw makePgError("42P01");
  };
  assert.equal(await findPreviousSuccessfulUpload("abc123", missingTableQuery), null);
});

test("listAuditLogs memetakan baris snake_case ke camelCase dan menjepit batas limit 1..200", async () => {
  const recordedLimits: unknown[] = [];
  const queryFn: QueryExecutor = async (_text, values) => {
    recordedLimits.push(values?.[0]);
    return {
      rows: [
        {
          id: 42,
          created_at: new Date("2026-11-23T01:00:00Z"),
          action_type: "PACK_DUPLICATE_FORCED",
          status: "FORCED",
          company_slug: "astra",
          package_slug: "paket-1",
          target_label: "PT Astra / Paket 1",
          file_name: "astra-paket-1.json",
          content_hash: "deadbeef",
          forced_overwrite: true,
          summary: { added: 1 },
        },
      ],
    };
  };

  const defaultRes = await listAuditLogs(undefined, queryFn);
  assert.equal(defaultRes.migrationRequired, false);
  assert.deepEqual(defaultRes.logs, [
    {
      id: 42,
      createdAt: "2026-11-23T01:00:00.000Z",
      actionType: "PACK_DUPLICATE_FORCED",
      status: "FORCED",
      companySlug: "astra",
      packageSlug: "paket-1",
      targetLabel: "PT Astra / Paket 1",
      fileName: "astra-paket-1.json",
      contentHash: "deadbeef",
      forcedOverwrite: true,
      summary: { added: 1 },
    },
  ]);

  await listAuditLogs(0, queryFn);
  await listAuditLogs(-10, queryFn);
  await listAuditLogs(999, queryFn);
  await listAuditLogs(50, queryFn);
  assert.deepEqual(recordedLimits, [100, 1, 1, 200, 50]);
});

test("listAuditLogs mengembalikan migrationRequired: true pada 42P01 dan melempar ulang error lain", async () => {
  const missingTableQuery: QueryExecutor = async () => {
    throw makePgError("42P01");
  };
  const missingRes = await listAuditLogs(50, missingTableQuery);
  assert.deepEqual(missingRes, { logs: [], migrationRequired: true });

  const brokenQuery: QueryExecutor = async () => {
    throw makePgError("42601", "syntax error");
  };
  await assert.rejects(() => listAuditLogs(50, brokenQuery), { message: "syntax error" });
});
