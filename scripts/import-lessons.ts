import fs from "node:fs";
import path from "node:path";
import { previewOrImportLessonBatch } from "../src/lib/belajar/belajar.queries";
import { databasePool } from "../src/lib/db/pool";

function collectMarkdownFiles(dir: string): Array<{ fileName: string; content: string }> {
  if (!fs.existsSync(dir)) return [];
  const results: Array<{ fileName: string; content: string }> = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push({
        fileName: entry.name,
        content: fs.readFileSync(fullPath, "utf8"),
      });
    }
  }
  return results;
}

async function main() {
  const lessonsDir = path.resolve(process.cwd(), "content", "lessons");
  const files = collectMarkdownFiles(lessonsDir);
  if (files.length === 0) {
    console.log("Tidak ada file .md di content/lessons.");
    return;
  }

  const res = await previewOrImportLessonBatch({ files, dryRun: false });
  if (!res.ok) {
    console.error("Validasi gagal:", res.errors);
    process.exitCode = 1;
    return;
  }

  console.log(`Berhasil mengimpor ${res.upsertedCount} bab materi belajar ke database:`);
  for (const item of res.items) {
    console.log(` - [${item.action.toUpperCase()}] ${item.slug} (${item.title})`);
  }
}

main()
  .catch((err) => {
    console.error("Gagal mengimpor materi:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await databasePool.end();
  });
