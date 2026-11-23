import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { databasePool } from "../src/lib/db/pool";
import { validateEnglishWordsJson } from "../src/lib/english/logic";
import { upsertEnglishWords } from "../src/lib/english/queries";

// Mengimpor kamus bahasa Inggris secara idempoten (upsert berdasarkan kolom 'no').
async function main(): Promise<void> {
  const argPath = process.argv[2];
  const candidates = argPath
    ? [resolve(process.cwd(), argPath)]
    : [
        resolve(process.cwd(), "db/english/kamus-1000.json"),
        resolve(process.cwd(), "db/Learning/Inggris/kamus-1000 kata.json"),
      ];

  const filePath = candidates.find((p) => existsSync(p));
  if (!filePath) {
    throw new Error(
      "File kamus tidak ditemukan di db/english/kamus-1000.json maupun db/Learning/Inggris/kamus-1000 kata.json",
    );
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  const validation = validateEnglishWordsJson(parsed);
  if (!validation.ok) {
    console.error("Validasi kamus gagal:");
    for (const err of validation.errors) {
      console.error(`- ${err}`);
    }
    process.exitCode = 1;
    return;
  }

  const { upsertedCount } = await upsertEnglishWords(validation.words);
  console.log(`Seed kamus selesai: ${upsertedCount} kata di-upsert dari ${filePath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => databasePool.end());
