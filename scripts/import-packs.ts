import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { importPack } from "../src/lib/admin/pack-import";
import { validatePack } from "../src/lib/admin/pack-schema";
import { databasePool } from "../src/lib/db/pool";

// Mengimpor semua file paket di db/packs (atau satu file bila path diberikan sebagai argumen).
// Untuk pemakaian sehari-hari, unggah file paket lewat halaman /admin/import.
async function main(): Promise<void> {
  const argumentPath = process.argv[2];
  const packsDirectory = resolve(process.cwd(), "db/packs");
  const filePaths = argumentPath
    ? [resolve(process.cwd(), argumentPath)]
    : readdirSync(packsDirectory)
        .filter(function isJson(fileName) {
          return fileName.endsWith(".json");
        })
        .sort()
        .map(function toPath(fileName) {
          return join(packsDirectory, fileName);
        });

  if (filePaths.length === 0) {
    console.log("Tidak ada file paket untuk diimpor.");
    return;
  }

  for (const filePath of filePaths) {
    const validation = validatePack(JSON.parse(readFileSync(filePath, "utf8")));
    if (!validation.ok) {
      console.error(`${filePath} tidak valid:`);
      validation.errors.forEach(function printError(error) {
        console.error(`- ${error}`);
      });
      process.exitCode = 1;
      continue;
    }
    const summary = await importPack(validation.pack, { dryRun: false, force: true });
    console.log(`${summary.companyName} / ${summary.packageName}: ${summary.subtests.length} subtes, ${summary.totalQuestions} soal diimpor`);
  }
}

main()
  .catch(function handleError(error) {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(function closePool() {
    return databasePool.end();
  });
