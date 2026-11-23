import { createHash } from "node:crypto";
import type { QuestionType, SubtestKind } from "./types";

const OPTION_KEYS = ["A", "B", "C", "D", "E"] as const;
const MAX_SPOT_CHECKS = 3;
const MAX_SNIPPET_LENGTH = 110;
const MAX_FILE_NAME_LENGTH = 180;
const MAX_NAME_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_DURATION_SECONDS = 10;
const MAX_DURATION_SECONDS = 10800;

export type SubtestChangeType = "baru" | "identik" | "berubah";

export interface ExistingQuestionSnapshot {
  orderIndex: number;
  type: QuestionType;
  prompt: string;
  imageSvg: string | null;
  options: string[];
  correctIndex: number;
  explanation: string;
  steps: string[] | null;
  wrongNotes: string[] | null;
  quickTip: string | null;
}

export interface ExistingSubtestSnapshot {
  name: string;
  description: string | null;
  durationSeconds: number;
  kind: SubtestKind;
  config: unknown | null;
  questions: ExistingQuestionSnapshot[];
}

export interface IncomingSubtestSnapshot {
  name: string;
  description: string | null;
  durationSeconds: number;
  kind: SubtestKind;
  config: unknown | null;
  questions: ExistingQuestionSnapshot[];
}

export interface SubtestComparisonResult {
  changeType: "identik" | "berubah";
  existingQuestionCount: number;
  incomingQuestionCount: number;
  changedQuestionCount: number;
  existingDetailedCount: number;
  incomingDetailedCount: number;
  losesDetailedExplanations: boolean;
}

export interface ExplanationSpotCheck {
  subtestSlug: string;
  subtestName: string;
  number: number;
  correctOption: string;
  dbPromptSnippet: string;
  incomingSnippet: string;
  alreadyHasDetailed: boolean;
}

export interface ExplanationEntryInput {
  number: number;
  correctIndex: number;
  prompt?: string;
  explanation?: string;
  steps?: string[];
  wrongNotes?: string[];
  quickTip?: string;
}

export interface ExplanationSubtestComparison {
  changeType: SubtestChangeType;
  existingQuestionCount: number;
  incomingCount: number;
  coverageMismatch: boolean;
  existingDetailedOverwriteCount: number;
  spotChecks: ExplanationSpotCheck[];
  promptMismatchErrors: string[];
}

export interface MetadataDiffResult {
  changed: boolean;
  warnings: string[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  if (!isPlainRecord(value)) {
    return value;
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const child = value[key];
    if (child !== undefined) {
      sorted[key] = canonicalizeValue(child);
    }
  }
  return sorted;
}

/** Menghasilkan hash SHA-256 deterministik atas payload JSON dengan urutan key kanonikal. */
export function computeCanonicalHash(payload: unknown): string {
  const serialized = JSON.stringify(canonicalizeValue(payload)) ?? "undefined";
  return createHash("sha256").update(serialized).digest("hex");
}

/** Menormalkan spasi dan baris baru untuk pencocokan teks prompt. */
export function normalizePromptText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Membersihkan nama file unggahan dari separator path, karakter kontrol, dan membatasi panjang. */
export function sanitizeImportFileName(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  let cleaned = "";
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    if (ch === "/" || ch === "\\" || code < 32 || code === 127) {
      continue;
    }
    cleaned += ch;
  }
  const trimmed = cleaned.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, MAX_FILE_NAME_LENGTH);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** Menentukan apakah soal memiliki pembahasan lengkap (steps, wrongNotes, atau quickTip bermakna). */
export function hasDetailedExplanation(entry: {
  steps?: string[] | null;
  wrongNotes?: string[] | null;
  quickTip?: string | null;
}): boolean {
  const hasSteps = Array.isArray(entry.steps) && entry.steps.some(isNonEmptyText);
  const hasWrongNotes = Array.isArray(entry.wrongNotes) && entry.wrongNotes.some(isNonEmptyText);
  const hasQuickTip = isNonEmptyText(entry.quickTip);
  return hasSteps || hasWrongNotes || hasQuickTip;
}

function hashQuestion(q: ExistingQuestionSnapshot): string {
  return computeCanonicalHash({
    orderIndex: q.orderIndex,
    type: q.type,
    prompt: q.prompt,
    imageSvg: q.imageSvg ?? null,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    steps: q.steps ?? null,
    wrongNotes: q.wrongNotes ?? null,
    quickTip: q.quickTip ?? null,
  });
}

function hashSubtestMeta(s: ExistingSubtestSnapshot | IncomingSubtestSnapshot): string {
  return computeCanonicalHash({
    name: s.name,
    description: s.description ?? null,
    durationSeconds: s.durationSeconds,
    kind: s.kind,
    config: s.config ?? null,
  });
}

/** Membandingkan subtes lama di DB dengan subtes masuk untuk mendeteksi perubahan dan risiko kehilangan pembahasan detail. */
export function compareSubtestContent(
  existing: ExistingSubtestSnapshot,
  incoming: IncomingSubtestSnapshot,
): SubtestComparisonResult {
  const existingSorted = [...existing.questions].sort((a, b) => a.orderIndex - b.orderIndex);
  const incomingSorted = [...incoming.questions].sort((a, b) => a.orderIndex - b.orderIndex);

  const maxLen = Math.max(existingSorted.length, incomingSorted.length);
  let changedQuestionCount = 0;
  for (let i = 0; i < maxLen; i += 1) {
    if (i >= existingSorted.length || i >= incomingSorted.length) {
      changedQuestionCount += 1;
    } else if (hashQuestion(existingSorted[i]) !== hashQuestion(incomingSorted[i])) {
      changedQuestionCount += 1;
    }
  }

  const metaChanged = hashSubtestMeta(existing) !== hashSubtestMeta(incoming);
  const existingDetailedCount =
    existing.kind === "QUIZ" ? existingSorted.filter(hasDetailedExplanation).length : 0;
  const incomingDetailedCount =
    incoming.kind === "QUIZ" ? incomingSorted.filter(hasDetailedExplanation).length : 0;

  return {
    changeType: metaChanged || changedQuestionCount > 0 ? "berubah" : "identik",
    existingQuestionCount: existingSorted.length,
    incomingQuestionCount: incomingSorted.length,
    changedQuestionCount,
    existingDetailedCount,
    incomingDetailedCount,
    losesDetailedExplanations: existingDetailedCount > 0 && incomingDetailedCount < existingDetailedCount,
  };
}

function truncateSnippet(text: string): string {
  const normalized = normalizePromptText(text);
  if (normalized.length <= MAX_SNIPPET_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_SNIPPET_LENGTH - 1)}…`;
}

function pickIncomingSnippet(entry: ExplanationEntryInput): string {
  const candidate =
    entry.steps?.find(isNonEmptyText) ??
    (isNonEmptyText(entry.quickTip) ? entry.quickTip : undefined) ??
    (isNonEmptyText(entry.explanation) ? entry.explanation : undefined) ??
    entry.wrongNotes?.find(isNonEmptyText) ??
    "";
  return truncateSnippet(candidate);
}

/** Membandingkan file pembahasan terhadap soal QUIZ di DB dengan semantik COALESCE dan spot-check maks 3 butir. */
export function compareExplanationSubtest(
  subtestSlug: string,
  subtestName: string,
  existingQuestions: ExistingQuestionSnapshot[],
  incomingEntries: ExplanationEntryInput[],
): ExplanationSubtestComparison {
  const byNumber = new Map(existingQuestions.map((q) => [q.orderIndex, q] as const));
  const promptMismatchErrors: string[] = [];
  const spotChecks: ExplanationSpotCheck[] = [];

  let anyChanged = false;
  let existingDetailedOverwriteCount = 0;

  for (const entry of incomingEntries) {
    const question = byNumber.get(entry.number);
    if (!question) {
      continue;
    }

    if (entry.prompt !== undefined && normalizePromptText(entry.prompt) !== normalizePromptText(question.prompt)) {
      promptMismatchErrors.push(
        `${subtestSlug} soal ${entry.number}: prompt di file pembahasan tidak cocok dengan database`,
      );
    }

    const beforeHash = computeCanonicalHash({
      explanation: question.explanation,
      steps: question.steps ?? null,
      wrongNotes: question.wrongNotes ?? null,
      quickTip: question.quickTip ?? null,
    });
    const afterHash = computeCanonicalHash({
      explanation: entry.explanation !== undefined ? entry.explanation : question.explanation,
      steps: entry.steps !== undefined ? entry.steps : (question.steps ?? null),
      wrongNotes: entry.wrongNotes !== undefined ? entry.wrongNotes : (question.wrongNotes ?? null),
      quickTip: entry.quickTip !== undefined ? entry.quickTip : (question.quickTip ?? null),
    });

    const alreadyHasDetailed = hasDetailedExplanation(question);
    if (beforeHash !== afterHash) {
      anyChanged = true;
      if (alreadyHasDetailed) {
        existingDetailedOverwriteCount += 1;
      }
    }

    if (spotChecks.length < MAX_SPOT_CHECKS) {
      spotChecks.push({
        subtestSlug,
        subtestName,
        number: entry.number,
        correctOption: OPTION_KEYS[entry.correctIndex] ?? "?",
        dbPromptSnippet: truncateSnippet(question.prompt),
        incomingSnippet: pickIncomingSnippet(entry),
        alreadyHasDetailed,
      });
    }
  }

  let changeType: SubtestChangeType = "identik";
  if (anyChanged) {
    const subtestHadDetailed = existingQuestions.some(hasDetailedExplanation);
    changeType = existingDetailedOverwriteCount > 0 || subtestHadDetailed ? "berubah" : "baru";
  }

  return {
    changeType,
    existingQuestionCount: existingQuestions.length,
    incomingCount: incomingEntries.length,
    coverageMismatch: incomingEntries.length !== existingQuestions.length,
    existingDetailedOverwriteCount,
    spotChecks,
    promptMismatchErrors,
  };
}

/** Mendeteksi perubahan nama atau deskripsi perusahaan/paket; deskripsi undefined diabaikan. */
export function compareContainerMetadata(
  label: "Perusahaan" | "Paket",
  existing: { name: string; description: string | null },
  incoming: { name: string; description?: string },
): MetadataDiffResult {
  const warnings: string[] = [];
  if (incoming.name !== existing.name) {
    warnings.push(`Nama ${label} berubah: "${existing.name}" → "${incoming.name}"`);
  }
  if (incoming.description !== undefined) {
    const prevDesc = existing.description?.trim() || null;
    const nextDesc = incoming.description.trim() || null;
    if (prevDesc !== nextDesc) {
      warnings.push(`Deskripsi ${label} berubah: "${prevDesc ?? "(kosong)"}" → "${nextDesc ?? "(kosong)"}"`);
    }
  }
  return {
    changed: warnings.length > 0,
    warnings,
  };
}

function validateNameField(rawName: unknown, label: string): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof rawName !== "string") {
    return { ok: false, error: `Nama ${label} wajib diisi.` };
  }
  const trimmed = rawName.trim();
  if (!trimmed) {
    return { ok: false, error: `Nama ${label} tidak boleh kosong.` };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Nama ${label} maksimal ${MAX_NAME_LENGTH} karakter.` };
  }
  return { ok: true, name: trimmed };
}

/** Memvalidasi payload pembaruan nama & deskripsi paket dari admin inline edit. */
export function validatePackageUpdateInput(
  input: unknown,
): { ok: true; data: { name: string; description: string | null } } | { ok: false; error: string } {
  if (!isPlainRecord(input)) {
    return { ok: false, error: "Payload pembaruan paket tidak valid." };
  }
  const nameResult = validateNameField(input.name, "paket");
  if (!nameResult.ok) {
    return nameResult;
  }

  let description: string | null = null;
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") {
      return { ok: false, error: "Deskripsi paket harus berupa teks." };
    }
    const trimmedDesc = input.description.trim();
    if (trimmedDesc.length > MAX_DESCRIPTION_LENGTH) {
      return { ok: false, error: `Deskripsi paket maksimal ${MAX_DESCRIPTION_LENGTH} karakter.` };
    }
    description = trimmedDesc === "" ? null : trimmedDesc;
  }

  return { ok: true, data: { name: nameResult.name, description } };
}

/** Memvalidasi payload pembaruan nama & durasi subtes sesuai SubtestKind. */
export function validateSubtestUpdateInput(
  input: unknown,
  kind: SubtestKind,
  currentDurationSeconds: number,
): { ok: true; data: { name: string; durationSeconds: number } } | { ok: false; error: string } {
  if (!isPlainRecord(input)) {
    return { ok: false, error: "Payload pembaruan subtes tidak valid." };
  }
  const nameResult = validateNameField(input.name, "subtes");
  if (!nameResult.ok) {
    return nameResult;
  }

  if (kind === "PAULI" || kind === "DRAWING") {
    if (input.durationSeconds !== undefined && input.durationSeconds !== currentDurationSeconds) {
      return {
        ok: false,
        error: "Durasi subtes Pauli dan Menggambar mengikuti konfigurasi JSON dan tidak dapat diubah secara manual.",
      };
    }
    return { ok: true, data: { name: nameResult.name, durationSeconds: currentDurationSeconds } };
  }

  const duration = input.durationSeconds;
  if (
    typeof duration !== "number" ||
    !Number.isInteger(duration) ||
    duration < MIN_DURATION_SECONDS ||
    duration > MAX_DURATION_SECONDS
  ) {
    return {
      ok: false,
      error: `Durasi subtes harus berupa bilangan bulat antara ${MIN_DURATION_SECONDS} hingga ${MAX_DURATION_SECONDS} detik.`,
    };
  }

  return { ok: true, data: { name: nameResult.name, durationSeconds: duration } };
}
