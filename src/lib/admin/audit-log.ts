import type {
  AuditActionType,
  AuditStatus,
  ImportAuditLogEntry,
  PreviousUploadRecord,
  QueryExecutor,
  RecordAuditLogInput,
} from "@/types/admin";

async function executeDefaultQuery(
  text: string,
  values?: unknown[],
): Promise<{ rows: Record<string, unknown>[] }> {
  const { databasePool } = await import("@/lib/db/pool");
  const result = await databasePool.query<Record<string, unknown>>(text, values);
  return { rows: result.rows };
}

/** Deteksi error PostgreSQL 42P01 (undefined_table) sebelum migrasi dijalankan. */
export function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "42P01"
  );
}

function toIsoTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Catat peristiwa impor atau mutasi CMS secara fail-safe tanpa menggagalkan aksi utama. */
export async function recordAuditLog(
  input: RecordAuditLogInput,
  queryFn: QueryExecutor = executeDefaultQuery,
): Promise<void> {
  try {
    await queryFn(
      `INSERT INTO import_audit_logs (
        action_type, status, company_slug, package_slug, target_label,
        file_name, content_hash, forced_overwrite, summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        input.actionType,
        input.status,
        input.companySlug ?? null,
        input.packageSlug ?? null,
        input.targetLabel ?? null,
        input.fileName ?? null,
        input.contentHash ?? null,
        input.forcedOverwrite ?? false,
        JSON.stringify(input.summary ?? {}),
      ],
    );
  } catch (error) {
    if (isUndefinedTableError(error)) {
      console.warn("[audit-log] Tabel import_audit_logs belum tersedia; jalankan npm run db:migrate.");
      return;
    }
    console.error("[audit-log] Gagal mencatat log audit:", error);
  }
}

/** Cari unggahan berhasil sebelumnya dengan contentHash identik untuk deteksi duplikasi file. */
export async function findPreviousSuccessfulUpload(
  contentHash: string,
  queryFn: QueryExecutor = executeDefaultQuery,
): Promise<PreviousUploadRecord | null> {
  try {
    const result = await queryFn(
      `SELECT created_at, file_name
       FROM import_audit_logs
       WHERE content_hash = $1 AND status IN ('SUCCESS', 'FORCED')
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [contentHash],
    );
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      createdAt: toIsoTimestamp(row.created_at),
      fileName: toNullableString(row.file_name),
    };
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return null;
    }
    throw error;
  }
}

/** Ambil daftar log audit terbaru (dibatasi 1..200) serta status ketersediaan tabel. */
export async function listAuditLogs(
  limit = 100,
  queryFn: QueryExecutor = executeDefaultQuery,
): Promise<{ logs: ImportAuditLogEntry[]; migrationRequired: boolean }> {
  const safeLimit = Number.isFinite(limit)
    ? Math.min(200, Math.max(1, Math.trunc(limit)))
    : 100;

  try {
    const result = await queryFn(
      `SELECT id, created_at, action_type, status, company_slug, package_slug,
              target_label, file_name, content_hash, forced_overwrite, summary
       FROM import_audit_logs
       ORDER BY created_at DESC, id DESC
       LIMIT $1`,
      [safeLimit],
    );
    const logs: ImportAuditLogEntry[] = result.rows.map((row) => ({
      id: Number(row.id),
      createdAt: toIsoTimestamp(row.created_at),
      actionType: row.action_type as AuditActionType,
      status: row.status as AuditStatus,
      companySlug: toNullableString(row.company_slug),
      packageSlug: toNullableString(row.package_slug),
      targetLabel: toNullableString(row.target_label),
      fileName: toNullableString(row.file_name),
      contentHash: toNullableString(row.content_hash),
      forcedOverwrite: Boolean(row.forced_overwrite),
      summary:
        typeof row.summary === "object" && row.summary !== null && !Array.isArray(row.summary)
          ? (row.summary as Record<string, unknown>)
          : {},
    }));
    return { logs, migrationRequired: false };
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return { logs: [], migrationRequired: true };
    }
    throw error;
  }
}
