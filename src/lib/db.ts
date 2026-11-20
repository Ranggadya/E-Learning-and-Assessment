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
    const cleanedUrl = connectionString
      .replace(/[?&]sslmode=[^&]+/g, "")
      .replace(/\?$/, "");

    return new Pool({
      connectionString: cleanedUrl,
      max: 5,
      ssl: { rejectUnauthorized: false },
    });
  }

  // Batas koneksi kecil agar aman di hosting serverless (Vercel + Neon/Supabase).
  return new Pool({ connectionString, max: 5 });
}

// Satu pool dipakai ulang agar hot reload di mode dev tidak membuka koneksi baru terus-menerus.
export const databasePool: Pool = globalThis.databasePool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.databasePool = databasePool;
}
