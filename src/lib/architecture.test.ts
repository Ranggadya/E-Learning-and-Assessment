import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";
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

function stripCommentsAndBom(source: string): string {
  const withoutBom = source.replace(/^\uFEFF/, "");
  const tokenPattern =
    /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g;
  return withoutBom.replace(tokenPattern, (match) => {
    if (match.startsWith("//")) {
      return "";
    }
    if (match.startsWith("/*")) {
      return " ";
    }
    return match;
  });
}

function extractImportSpecifiers(cleanedSource: string): string[] {
  const specifiers: string[] = [];
  const staticImportPattern =
    /^\s*(?:import|export)\s+(?:[\w*{},\s$\r\n]+?\s+from\s+)?["']([^"']+)["']/gm;
  for (const match of cleanedSource.matchAll(staticImportPattern)) {
    specifiers.push(match[1]);
  }
  const dynamicImportPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*(?:,|\))/g;
  for (const match of cleanedSource.matchAll(dynamicImportPattern)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveToSrcRelative(relFile: string, specifier: string): string {
  if (specifier.startsWith("@/")) {
    return posix.normalize(specifier.slice(2));
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return posix.normalize(posix.join(posix.dirname(relFile), specifier));
  }
  return specifier;
}

function isClientModule(relPath: string, cleanedSource: string): boolean {
  if (relPath.startsWith("lib/client/")) {
    return true;
  }
  return /^["']use client["'](?:\s*;|\s|$)/.test(cleanedSource.trimStart());
}

test("invariant 1: src/types/ only contains type/interface declarations without lib or component imports", () => {
  const typeFiles = collectFiles(join(SRC_DIR, "types")).filter((file) => file.endsWith(".ts"));
  assert.ok(typeFiles.length > 0, "Expected at least one file in src/types/");

  const runtimeExportPattern =
    /^\s*export\s+(?:default\s+)?(?:const|let|var|function|async\s+function|class|enum)\b/m;
  const forbiddenTargetPattern = /^(?:lib|components)(?:$|\/)/;

  const violations: string[] = [];
  for (const file of typeFiles) {
    const rel = toPosixRelative(file);
    const cleaned = stripCommentsAndBom(readFileSync(file, "utf8"));
    if (runtimeExportPattern.test(cleaned)) {
      violations.push(`${rel}: contains runtime export`);
    }
    for (const spec of extractImportSpecifiers(cleaned)) {
      const target = resolveToSrcRelative(rel, spec);
      if (forbiddenTargetPattern.test(target)) {
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
  const forbiddenTargetPattern = /^(?:components|app)(?:$|\/)/;

  const violations: string[] = [];
  for (const file of libFiles) {
    const rel = toPosixRelative(file);
    const cleaned = stripCommentsAndBom(readFileSync(file, "utf8"));
    for (const spec of extractImportSpecifiers(cleaned)) {
      const target = resolveToSrcRelative(rel, spec);
      if (forbiddenTargetPattern.test(target)) {
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
  const forbiddenServerTargetPattern = new RegExp(
    "^(?:lib/db(?:$|/)|.*\\.queries(?:$|/|\\.)|lib/admin/(?:auth|audit-log|queries|pack-import|explanation-pack)(?:$|/|\\.))",
  );

  const violations: string[] = [];
  for (const file of sourceFiles) {
    const rel = toPosixRelative(file);
    const cleaned = stripCommentsAndBom(readFileSync(file, "utf8"));
    if (!isClientModule(rel, cleaned)) {
      continue;
    }
    for (const spec of extractImportSpecifiers(cleaned)) {
      const target = resolveToSrcRelative(rel, spec);
      if (forbiddenServerTargetPattern.test(target) || /\.queries(?:$|\/|\.)/.test(spec)) {
        violations.push(`${rel}: client module imports server-only "${spec}"`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
