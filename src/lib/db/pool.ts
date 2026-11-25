import { Pool } from "pg";

declare global {
  var databasePool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur. Salin .env.example menjadi .env.local.");
  }

  const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  // Untuk database cloud (Supabase / Neon), gunakan SSL dengan rejectUnauthorized: false
  // dan bersihkan query sslmode agar tidak memicu verifikasi sertifikat lokal (SELF_SIGNED_CERT_IN_CHAIN).
  if (!isLocal) {
    const parsedUrl = new URL(connectionString);
    parsedUrl.searchParams.delete("sslmode");
    // shortcut: Supabase pooler memakai root CA sendiri (SELF_SIGNED_CERT_IN_CHAIN di Node), upgrade ke ssl.ca jika sertifikat CA dipasang di env
    const disableVerify =
      process.env.DATABASE_SSL_NO_VERIFY === "1" ||
      parsedUrl.hostname.includes("supabase.com") ||
      parsedUrl.hostname.includes("supabase.co");

    // shortcut: max: 2 + idle 5 dtk agar aman terhadap batas Supabase Session Mode (pool_size: 15) di serverless; naikkan jika DATABASE_URL memakai Transaction Mode port 6543
    return new Pool({
      connectionString: parsedUrl.toString(),
      max: 2,
      keepAlive: true,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
      ssl: disableVerify ? { rejectUnauthorized: false } : true,
    });
  }

  // Batas koneksi kecil agar aman di hosting serverless (Vercel + Neon/Supabase).
  return new Pool({
    connectionString,
    max: 5,
    keepAlive: true,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
}

// Satu pool dipakai ulang lintas request pada instance yang hangat maupun saat hot reload di dev.
export const databasePool: Pool = globalThis.databasePool ?? createPool();
globalThis.databasePool = databasePool;
