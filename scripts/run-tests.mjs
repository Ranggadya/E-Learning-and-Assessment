import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

function collectTestFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = collectTestFiles(resolve("src/lib")).sort();
const tsxCli = resolve("node_modules/tsx/dist/cli.mjs");

const result = spawnSync(process.execPath, [tsxCli, "--test", ...files], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
