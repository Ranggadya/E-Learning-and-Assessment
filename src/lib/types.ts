export type QuestionType = "TEXT" | "IMAGE" | "MEMORY" | "SPEED";
export type SubtestKind = "QUIZ" | "PERSONALITY" | "PAULI" | "DRAWING";

export const SUBTEST_UNIT: Record<SubtestKind, string> = {
  QUIZ: "soal",
  PERSONALITY: "pernyataan",
  PAULI: "kolom",
  DRAWING: "tugas gambar",
};

export const SUBTEST_KIND_LABEL: Record<SubtestKind, string> = {
  QUIZ: "Pilihan Ganda",
  PERSONALITY: "Kepribadian",
  PAULI: "Koran / Pauli",
  DRAWING: "Menggambar",
};

export interface PersonalityTraitConfig {
  key: string;
  name: string;
  description: string;
  highMeaning: string;
  lowMeaning: string;
}

export interface PersonalityStatementConfig {
  text: string;
  trait: string;
  reverse?: boolean;
}

export interface PersonalityConfig {
  traits: PersonalityTraitConfig[];
  statements: PersonalityStatementConfig[];
}

export interface PauliConfig {
  columns: number;
  digitsPerColumn: number;
  secondsPerColumn: number;
}

export interface DrawingTaskConfig {
  key: string;
  title: string;
  instruction: string;
  seconds: number;
}

export interface DrawingConfig {
  tasks: DrawingTaskConfig[];
  reflection?: string[];
}

export interface PersonalityTraitScore {
  key: string;
  name: string;
  description: string;
  score: number;
  maxScore: number;
  percent: number;
  level: "Tinggi" | "Sedang" | "Rendah" | "Belum dijawab";
  meaning: string;
}

export interface PersonalityResult {
  kind: "PERSONALITY";
  answered: number;
  total: number;
  traits: PersonalityTraitScore[];
}

export interface PauliColumnStat {
  column: number;
  answered: number;
  correct: number;
}

export interface PauliResult {
  kind: "PAULI";
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  perColumn: PauliColumnStat[];
}

export interface DrawingSubmission {
  key: string;
  title: string;
  instruction: string;
  dataUrl: string;
}

export interface DrawingResult {
  kind: "DRAWING";
  drawings: DrawingSubmission[];
  reflection: string[];
}

export type NonQuizResult = PersonalityResult | PauliResult | DrawingResult;

export function countSubtestItems(kind: SubtestKind, rawQuestionCount: number, config: unknown): number {
  if (kind === "QUIZ" || typeof config !== "object" || config === null) {
    return rawQuestionCount;
  }
  const c = config as Record<string, unknown>;
  if (kind === "PERSONALITY" && Array.isArray(c.statements)) {
    return c.statements.length;
  }
  if (kind === "PAULI" && typeof c.columns === "number") {
    return c.columns;
  }
  if (kind === "DRAWING" && Array.isArray(c.tasks)) {
    return c.tasks.length;
  }
  return rawQuestionCount;
}

export function resolveSubtestDuration(kind: SubtestKind, durationSeconds: number | undefined, config: unknown): number {
  if (durationSeconds && durationSeconds > 0) {
    return durationSeconds;
  }
  if (typeof config === "object" && config !== null) {
    if (kind === "PAULI") {
      const c = config as { columns?: number; secondsPerColumn?: number };
      return (c.columns ?? 10) * (c.secondsPerColumn ?? 30);
    }
    if (kind === "DRAWING") {
      const c = config as { tasks?: Array<{ seconds?: number }> };
      return Array.isArray(c.tasks) ? c.tasks.reduce((sum, t) => sum + (t.seconds || 0), 0) : 300;
    }
  }
  return 0;
}

export function scorePersonality(config: PersonalityConfig, ratings: Array<number | null>): PersonalityResult {
  const statements = Array.isArray(config?.statements) ? config.statements : [];
  const traits = Array.isArray(config?.traits) ? config.traits : [];
  const totalsByTrait = new Map<string, { score: number; count: number }>();
  let answered = 0;

  statements.forEach((stmt, idx) => {
    const raw = ratings[idx];
    if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 5) {
      answered += 1;
      const points = stmt.reverse ? 6 - raw : raw;
      const current = totalsByTrait.get(stmt.trait) ?? { score: 0, count: 0 };
      current.score += points;
      current.count += 1;
      totalsByTrait.set(stmt.trait, current);
    }
  });

  const traitResults: PersonalityTraitScore[] = traits.map((trait) => {
    const stat = totalsByTrait.get(trait.key) ?? { score: 0, count: 0 };
    if (stat.count === 0) {
      return {
        key: trait.key,
        name: trait.name,
        description: trait.description,
        score: 0,
        maxScore: 0,
        percent: 0,
        level: "Belum dijawab",
        meaning: "Belum ada pernyataan yang dijawab pada aspek ini.",
      };
    }
    const maxScore = stat.count * 5;
    const percent = Math.round(((stat.score - stat.count) / (stat.count * 4)) * 100);
    const level: "Tinggi" | "Sedang" | "Rendah" =
      percent >= 65 ? "Tinggi" : percent <= 35 ? "Rendah" : "Sedang";
    const meaning =
      level === "Tinggi"
        ? trait.highMeaning
        : level === "Rendah"
          ? trait.lowMeaning
          : "Skormu berada di rentang tengah — seimbang antara dua kutub sifat ini.";
    return {
      key: trait.key,
      name: trait.name,
      description: trait.description,
      score: stat.score,
      maxScore,
      percent,
      level,
      meaning,
    };
  });

  return {
    kind: "PERSONALITY",
    answered,
    total: statements.length,
    traits: traitResults,
  };
}

export interface QuestionOption {
  key: string;
  label: string;
}

export interface Company {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  packageCount: number;
  subtestCount: number;
  subtestIds: number[];
}

export interface TestPackage {
  id: number;
  companyId: number;
  slug: string;
  name: string;
  description: string | null;
  subtestCount: number;
  questionCount: number;
}

export interface Subtest {
  id: number;
  testPackageId: number;
  slug: string;
  name: string;
  description: string | null;
  durationSeconds: number;
  orderIndex: number;
  questionCount: number;
  questionTypes: QuestionType[];
  kind: SubtestKind;
  config: unknown | null;
}

export interface SubtestLocation extends Subtest {
  companySlug: string;
  companyName: string;
  packageSlug: string;
  packageName: string;
}

// Katalog lengkap untuk dashboard peserta.
export interface DashboardSubtest {
  id: number;
  slug: string;
  name: string;
  durationSeconds: number;
  questionCount: number;
  questionTypes: QuestionType[];
  kind: SubtestKind;
  config: unknown | null;
}

export interface DashboardPackage {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  subtests: DashboardSubtest[];
}

export interface DashboardCompany {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  packages: DashboardPackage[];
}

// Soal yang dikirim ke peserta: tanpa kunci jawaban dan pembahasan.
export interface PublicQuestion {
  id: number;
  type: QuestionType;
  orderIndex: number;
  prompt: string;
  imageSvg: string | null;
  options: QuestionOption[];
}

export interface ReviewItem {
  questionId: number;
  orderIndex: number;
  prompt: string;
  imageSvg: string | null;
  options: QuestionOption[];
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  explanation: string | null;
  steps: string[] | null;
  // Alasan tiap opsi salah, sejajar dengan options (string kosong = tidak ada catatan).
  wrongNotes: string[] | null;
  quickTip: string | null;
}

export interface AttemptResult {
  attemptId: number;
  subtestId: number;
  subtestName: string;
  subtestKind: SubtestKind;
  companySlug: string;
  companyName: string;
  packageSlug: string;
  packageName: string;
  score: number;
  totalQuestions: number;
  finishedAt: string | null;
  reviewItems: ReviewItem[];
  result?: NonQuizResult | null;
}

export interface SubmitAnswerInput {
  questionId: number;
  selectedOption: string | null;
}

export interface SubmitAttemptInput {
  subtestId: number;
  answers: SubmitAnswerInput[];
}

export type SubmitNonQuizInput =
  | { subtestId: number; kind: "PERSONALITY"; ratings: Array<number | null> }
  | { subtestId: number; kind: "PAULI"; perColumn: PauliColumnStat[] }
  | { subtestId: number; kind: "DRAWING"; drawings: DrawingSubmission[] };

// Ringkasan untuk dashboard admin.
export interface AdminSubtest {
  id: number;
  slug: string;
  name: string;
  durationSeconds: number;
  questionCount: number;
  kind?: SubtestKind;
  config?: unknown | null;
}

export interface AdminPackage {
  id: number;
  slug: string;
  name: string;
  subtests: AdminSubtest[];
}

export interface AdminCompany {
  id: number;
  slug: string;
  name: string;
  packages: AdminPackage[];
}
