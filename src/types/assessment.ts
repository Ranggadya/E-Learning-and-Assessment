export type QuestionType = "TEXT" | "IMAGE" | "MEMORY" | "SPEED";
export type SubtestKind = "QUIZ" | "PERSONALITY" | "PAULI" | "DRAWING";

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
  description?: string | null;
  orderIndex?: number;
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

export interface DashboardStats {
  totalCompanies: number;
  totalPackages: number;
  totalSubtests: number;
  totalQuestions: number;
  completedSubtests: number;
  avgAccuracy: number | null;
}

export type NextActionMode = "resume" | "completed" | "start";

export interface NextAction {
  mode: NextActionMode;
  href: string;
  packageHref: string;
  estimatedMinutes: number;
  tag: string;
  title: string;
  meta: string;
  ctaLabel: string;
}

export interface WeeklyActivityDay {
  dateKey: string;
  dayLabel: string;
  fullDateLabel: string;
  attempts: number;
  estimatedMinutes: number;
  isToday: boolean;
}

export interface WeeklyActivitySeries {
  days: WeeklyActivityDay[];
  totalAttempts: number;
  totalMinutes: number;
  peakIndex: number;
}

export interface CalendarDayCell {
  dateKey: string;
  weekdayShort: string;
  dayNumber: number;
  isToday: boolean;
  hasActivity: boolean;
}

export interface WeekCalendarModel {
  monthLabel: string;
  days: CalendarDayCell[];
}

export interface UpcomingSubtestItem {
  subtestId: number;
  subtestName: string;
  companySlug: string;
  companyName: string;
  packageSlug: string;
  packageName: string;
  durationMinutes: number;
  kind: SubtestKind;
  questionCount: number;
}

export interface LocalProfile {
  displayName: string;
  roleTitle: string;
}

export interface VisiblePackagesResult {
  visible: DashboardPackage[];
  hiddenCount: number;
}

export interface AttemptBadge {
  label: string;
  tone: "emerald" | "amber" | "red" | "blue";
}

export interface LocalAttemptRecord {
  attemptId: number;
  subtestId: number;
  subtestName: string;
  companySlug: string;
  companyName: string;
  packageSlug: string;
  packageName: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

export interface SubtestProgress {
  bestScore: number;
  lastScore: number;
  totalQuestions: number;
  lastAttemptId: number;
  attemptsCount: number;
  lastCompletedAt: string;
}

export interface LocalProgressStore {
  bySubtestId: Record<string, SubtestProgress>;
  recentAttempts: LocalAttemptRecord[];
}
