import type { QuestionType, SubtestKind } from "./assessment";

// Ringkasan untuk dashboard admin.
export interface AdminSubtest {
  id: number;
  slug: string;
  name: string;
  durationSeconds: number;
  questionCount: number;
  detailedExplanationCount: number;
  kind?: SubtestKind;
  config?: unknown | null;
}

export interface AdminPackage {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  subtests: AdminSubtest[];
}

export interface AdminCompany {
  id: number;
  slug: string;
  name: string;
  packages: AdminPackage[];
}

export type AuditActionType =
  | "PACK_NEW"
  | "PACK_OVERWRITE"
  | "PACK_DUPLICATE_FORCED"
  | "EXPLANATION_NEW"
  | "EXPLANATION_OVERWRITE"
  | "EXPLANATION_DUPLICATE_FORCED"
  | "IMPORT_REJECTED"
  | "IMPORT_FAILED"
  | "PACKAGE_UPDATED"
  | "SUBTEST_UPDATED"
  | "PACKAGE_DELETED"
  | "SUBTEST_DELETED";

export type AuditStatus = "SUCCESS" | "FORCED" | "REJECTED" | "FAILED";

export interface ImportAuditLogEntry {
  id: number;
  createdAt: string;
  actionType: AuditActionType;
  status: AuditStatus;
  companySlug: string | null;
  packageSlug: string | null;
  targetLabel: string | null;
  fileName: string | null;
  contentHash: string | null;
  forcedOverwrite: boolean;
  summary: Record<string, unknown>;
}

export interface UpdatedPackageResult {
  companySlug: string;
  packageSlug: string;
  before: { name: string; description: string | null };
  after: { name: string; description: string | null };
}

export interface UpdatedSubtestResult {
  companySlug: string;
  packageSlug: string;
  packageName: string;
  subtestSlug: string;
  kind: SubtestKind;
  before: { name: string; durationSeconds: number };
  after: { name: string; durationSeconds: number };
}

export interface DeletedPackageMeta {
  companySlug: string;
  companyName: string;
  packageSlug: string;
  packageName: string;
}

export interface DeletedSubtestMeta {
  companySlug: string;
  packageSlug: string;
  packageName: string;
  subtestSlug: string;
  subtestName: string;
}

export interface ExportedPack {
  company: { slug: string; name: string; description?: string };
  package: { slug: string; name: string; description?: string };
  subtests: {
    slug: string;
    name: string;
    description?: string;
    kind?: SubtestKind;
    config?: unknown;
    durationSeconds: number;
    questions?: {
      type: QuestionType;
      prompt: string;
      imageSvg?: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      steps?: string[];
      wrongNotes?: string[];
      quickTip?: string;
    }[];
  }[];
}

export type QueryExecutor = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export interface RecordAuditLogInput {
  actionType: AuditActionType;
  status: AuditStatus;
  companySlug?: string | null;
  packageSlug?: string | null;
  targetLabel?: string | null;
  fileName?: string | null;
  contentHash?: string | null;
  forcedOverwrite?: boolean;
  summary?: Record<string, unknown>;
}

export interface PreviousUploadRecord {
  createdAt: string;
  fileName: string | null;
}

export type FindPreviousUploadFn = (
  contentHash: string,
  queryFn?: QueryExecutor,
) => Promise<PreviousUploadRecord | null>;

// Format satu file paket soal. Satu file = satu paket milik satu perusahaan.
export interface PackQuestion {
  type?: QuestionType;
  prompt: string;
  imageSvg?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  // Pembahasan lengkap (opsional): langkah pengerjaan, alasan tiap opsi salah (sejajar dengan options), dan quick tip.
  steps?: string[];
  wrongNotes?: string[];
  quickTip?: string;
}

export interface PackSubtest {
  slug: string;
  name: string;
  description?: string;
  kind?: SubtestKind;
  durationSeconds?: number;
  config?: unknown;
  questions?: PackQuestion[];
}

export interface PackFile {
  company: { slug: string; name: string; description?: string };
  package: { slug: string; name: string; description?: string };
  subtests: PackSubtest[];
}

export type PackValidation = { ok: true; pack: PackFile } | { ok: false; errors: string[] };

// File pembahasan: memperbarui pembahasan soal yang sudah ada tanpa mengganti soal atau menghapus riwayat.
// Setiap butir dicocokkan lewat nomor soal, dan correctIndex wajib sama dengan kunci di database
// sehingga pembahasan tidak bisa tertukar ke soal lain.
export interface ExplanationEntry {
  number: number;
  correctIndex: number;
  prompt?: string;
  explanation?: string;
  steps?: string[];
  wrongNotes?: string[];
  quickTip?: string;
}

export interface ExplanationPackFile {
  pembahasanSaja: true;
  company: { slug: string };
  package: { slug: string };
  subtests: { slug: string; explanations: ExplanationEntry[] }[];
}

export type ExplanationValidation = { ok: true; pack: ExplanationPackFile } | { ok: false; errors: string[] };

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

export interface SubtestSnapshot {
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
  changedNumbers: number[];
  coverageMismatch: boolean;
  existingDetailedOverwriteCount: number;
  spotChecks: ExplanationSpotCheck[];
  promptMismatchErrors: string[];
}

export interface MetadataDiffResult {
  changed: boolean;
  warnings: string[];
}

export interface ImportDbClient {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
  release(): void;
}

export interface ImportExecutionOptions {
  dryRun: boolean;
  force?: boolean;
  contentHash?: string;
  connectClient?: () => Promise<ImportDbClient>;
  findPreviousUpload?: FindPreviousUploadFn;
}

export interface ImportedSubtestSummary {
  slug: string;
  name: string;
  kind: SubtestKind;
  questionCount: number;
  durationSeconds: number;
  status: "baru" | "diganti";
  // Jumlah percobaan lama pada subtes ini yang detail jawabannya ikut terhapus saat soal diganti.
  replacedAttemptCount: number;
  changeType: SubtestChangeType;
  existingQuestionCount: number;
  changedQuestionCount: number;
  existingDetailedCount: number;
  incomingDetailedCount: number;
  losesDetailedExplanations: boolean;
  coverageMismatch?: boolean;
  existingDetailedOverwriteCount?: number;
}

export interface ImportSummary {
  companySlug: string;
  companyName: string;
  companyStatus: "baru" | "diperbarui";
  packageSlug: string;
  packageName: string;
  packageStatus: "baru" | "diperbarui";
  subtests: ImportedSubtestSummary[];
  totalQuestions: number;
  dryRun: boolean;
  // "pembahasan" = file pembahasan saja: soal dan riwayat tidak disentuh.
  mode?: "pembahasan";
  contentHash: string;
  isDuplicateContent: boolean;
  previousUploadAt: string | null;
  hasOverwrite: boolean;
  metadataChanged: boolean;
  requiresConfirmation: boolean;
  warnings: string[];
  spotChecks?: ExplanationSpotCheck[];
}
