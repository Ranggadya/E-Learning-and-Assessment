import { Pool } from "pg";

declare global {
  var databasePool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur. Salin .env.example menjadi .env.local.");
  }
  // Batas koneksi kecil agar aman di hosting serverless (Vercel + Neon/Supabase).
  return new Pool({ connectionString, max: 5 });
}

// Satu pool dipakai ulang agar hot reload di mode dev tidak membuka koneksi baru terus-menerus.
export const databasePool: Pool = globalThis.databasePool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.databasePool = databasePool;
}
