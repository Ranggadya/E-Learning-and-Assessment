export type QuestionType = "TEXT" | "IMAGE" | "MEMORY" | "SPEED";

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
}

export interface SubtestLocation extends Subtest {
  companySlug: string;
  packageSlug: string;
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
}

export interface AttemptResult {
  attemptId: number;
  subtestName: string;
  companySlug: string;
  packageSlug: string;
  score: number;
  totalQuestions: number;
  reviewItems: ReviewItem[];
}

export interface SubmitAnswerInput {
  questionId: number;
  selectedOption: string | null;
}

export interface SubmitAttemptInput {
  subtestId: number;
  answers: SubmitAnswerInput[];
}

// Ringkasan untuk dashboard admin.
export interface AdminSubtest {
  id: number;
  slug: string;
  name: string;
  durationSeconds: number;
  questionCount: number;
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
