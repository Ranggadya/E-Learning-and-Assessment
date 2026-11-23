import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const SRC_DIR = resolve("src");

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function toPosixRelative(filePath: string): string {
  return relative(SRC_DIR, filePath).replaceAll("\\", "/");
}

function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const staticImportPattern =
    /^\s*(?:import|export)\s+(?:[\w*{},\s$\r\n]+?\s+from\s+)?["']([^"']+)["']/gm;
  for (const match of source.matchAll(staticImportPattern)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function isClientModule(relPath: string, source: string): boolean {
  if (relPath.startsWith("lib/client/")) {
    return true;
  }
  const trimmed = source.trimStart();
  return trimmed.startsWith('"use client"') || trimmed.startsWith("'use client'");
}

test("invariant 1: src/types/ only contains type/interface declarations without lib or component imports", () => {
  const typeFiles = collectFiles(join(SRC_DIR, "types")).filter((file) => file.endsWith(".ts"));
  assert.ok(typeFiles.length > 0, "Expected at least one file in src/types/");

  const runtimeExportPattern =
    /^\s*export\s+(?:default\s+)?(?:const|let|var|function|async\s+function|class|enum)\b/m;
  const forbiddenImportPattern = /^(?:@\/lib\/|@\/components\/|\.\.\/lib\/|\.\.\/components\/)/;

  const violations: string[] = [];
  for (const file of typeFiles) {
    const rel = toPosixRelative(file);
    const source = readFileSync(file, "utf8");
    if (runtimeExportPattern.test(source)) {
      violations.push(`${rel}: contains runtime export`);
    }
    for (const spec of extractImportSpecifiers(source)) {
      if (forbiddenImportPattern.test(spec)) {
        violations.push(`${rel}: forbidden import "${spec}"`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test("invariant 2: src/lib/ never imports from components or app", () => {
  const libFiles = collectFiles(join(SRC_DIR, "lib")).filter(
    (file) => file.endsWith(".ts") || file.endsWith(".tsx"),
  );
  const forbiddenImportPattern = /^(?:@\/components\/|@\/app\/|\.\.\/components\/|\.\.\/app\/)/;

  const violations: string[] = [];
  for (const file of libFiles) {
    const rel = toPosixRelative(file);
    const source = readFileSync(file, "utf8");
    for (const spec of extractImportSpecifiers(source)) {
      if (forbiddenImportPattern.test(spec)) {
        violations.push(`${rel}: forbidden import "${spec}"`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test("invariant 3: root src/components/ has zero .tsx files", () => {
  const rootEntries = readdirSync(join(SRC_DIR, "components"), { withFileTypes: true });
  const rootTsxFiles = rootEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map((entry) => entry.name);

  assert.deepEqual(rootTsxFiles, []);
});

test("invariant 4: zero 0-byte files exist anywhere under src/", () => {
  const allFiles = collectFiles(SRC_DIR);
  const emptyFiles = allFiles
    .filter((file) => statSync(file).size === 0)
    .map((file) => toPosixRelative(file));

  assert.deepEqual(emptyFiles, []);
});

test("invariant 5: client modules never import server-only db, query, or admin modules", () => {
  const sourceFiles = collectFiles(SRC_DIR).filter(
    (file) => file.endsWith(".ts") || file.endsWith(".tsx"),
  );
  const forbiddenServerImportPattern =
    new RegExp(
      "^(?:@/lib/db/|(?:\\.\\./)+(?:lib/)?db/|.*\\.queries(?:$|/|\\.)|(?:@/lib/admin/|(?:\\.\\./)+(?:lib/)?admin/)(?:auth|audit-log|queries|pack-import|explanation-pack)(?:$|/|\\.))",
    );

  const violations: string[] = [];
  for (const file of sourceFiles) {
    const rel = toPosixRelative(file);
    const source = readFileSync(file, "utf8");
    if (!isClientModule(rel, source)) {
      continue;
    }
    for (const spec of extractImportSpecifiers(source)) {
      if (forbiddenServerImportPattern.test(spec)) {
        violations.push(`${rel}: client module imports server-only "${spec}"`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
