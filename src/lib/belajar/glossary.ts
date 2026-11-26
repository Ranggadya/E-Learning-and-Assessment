import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { GlossaryEntry } from "@/types/belajar";

let cachedGlossary: GlossaryEntry[] | null = null;

export function getGlossaryEntries(): GlossaryEntry[] {
  if (cachedGlossary && process.env.NODE_ENV === "production") {
    return cachedGlossary;
  }
  try {
    const raw = readFileSync(resolve(process.cwd(), "content/glossary.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const clean: GlossaryEntry[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).term === "string" &&
        typeof (item as Record<string, unknown>).definition === "string"
      ) {
        const term = ((item as Record<string, unknown>).term as string).trim();
        const definition = ((item as Record<string, unknown>).definition as string).trim();
        if (term && definition) {
          clean.push({ term, definition });
        }
      }
    }
    clean.sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
    cachedGlossary = clean;
    return clean;
  } catch {
    return [];
  }
}
