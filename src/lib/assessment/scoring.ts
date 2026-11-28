import { parsePgInt4Id } from "@/lib/format";
import type {
  DrawingConfig,
  DrawingResult,
  DrawingSubmission,
  PauliColumnStat,
  PauliConfig,
  PauliResult,
  PersonalityConfig,
  PersonalityResult,
  PersonalityTraitScore,
  SubmitAnswerInput,
  SubmitAttemptInput,
  SubmitNonQuizInput,
  SubtestKind,
} from "@/types/assessment";

export const MAX_QUIZ_ANSWERS = 200;
export const MAX_SELECTED_OPTION_LENGTH = 16;
export const MAX_PERSONALITY_RATINGS = 300;
export const MAX_PAULI_COLUMNS = 100;
export const MAX_DRAWING_TASKS = 10;
export const MAX_DRAWING_DATA_URL_LENGTH = 300 * 1024;
export const MAX_DRAWING_TEXT_LENGTH = 500;

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

export function resolveSubtestDuration(
  kind: SubtestKind,
  durationSeconds: number | undefined,
  config: unknown,
): number {
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

export function isValidQuizPayload(value: unknown): value is SubmitAttemptInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.kind !== undefined) {
    return false;
  }
  if (parsePgInt4Id(candidate.subtestId) === null || typeof candidate.subtestId !== "number") {
    return false;
  }
  if (!Array.isArray(candidate.answers) || candidate.answers.length > MAX_QUIZ_ANSWERS) {
    return false;
  }
  return candidate.answers.every(function isValidAnswer(raw) {
    if (typeof raw !== "object" || raw === null) {
      return false;
    }
    const answer = raw as Partial<SubmitAnswerInput>;
    if (parsePgInt4Id(answer.questionId) === null || typeof answer.questionId !== "number") {
      return false;
    }
    return (
      answer.selectedOption === null ||
      (typeof answer.selectedOption === "string" &&
        answer.selectedOption.length <= MAX_SELECTED_OPTION_LENGTH)
    );
  });
}

export function isValidNonQuizPayload(value: unknown): value is SubmitNonQuizInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (parsePgInt4Id(candidate.subtestId) === null || typeof candidate.subtestId !== "number") {
    return false;
  }
  if (candidate.kind === "PERSONALITY") {
    return (
      Array.isArray(candidate.ratings) &&
      candidate.ratings.length <= MAX_PERSONALITY_RATINGS &&
      candidate.ratings.every(
        (r) => r === null || (typeof r === "number" && Number.isInteger(r) && r >= 1 && r <= 5),
      )
    );
  }
  if (candidate.kind === "PAULI") {
    return (
      Array.isArray(candidate.perColumn) &&
      candidate.perColumn.length <= MAX_PAULI_COLUMNS &&
      candidate.perColumn.every((col) => {
        if (typeof col !== "object" || col === null) {
          return false;
        }
        const rec = col as Record<string, unknown>;
        return (
          typeof rec.column === "number" &&
          Number.isInteger(rec.column) &&
          rec.column >= 1 &&
          typeof rec.answered === "number" &&
          Number.isInteger(rec.answered) &&
          rec.answered >= 0 &&
          typeof rec.correct === "number" &&
          Number.isInteger(rec.correct) &&
          rec.correct >= 0
        );
      })
    );
  }
  if (candidate.kind === "DRAWING") {
    return (
      Array.isArray(candidate.drawings) &&
      candidate.drawings.length <= MAX_DRAWING_TASKS &&
      candidate.drawings.every((d) => {
        if (typeof d !== "object" || d === null) {
          return false;
        }
        const rec = d as Record<string, unknown>;
        return (
          typeof rec.key === "string" &&
          rec.key.length <= MAX_DRAWING_TEXT_LENGTH &&
          typeof rec.title === "string" &&
          rec.title.length <= MAX_DRAWING_TEXT_LENGTH &&
          typeof rec.instruction === "string" &&
          rec.instruction.length <= MAX_DRAWING_TEXT_LENGTH &&
          typeof rec.dataUrl === "string" &&
          rec.dataUrl.length <= MAX_DRAWING_DATA_URL_LENGTH &&
          (rec.dataUrl === "" || rec.dataUrl.startsWith("data:image/png;base64,"))
        );
      })
    );
  }
  return false;
}

export function scoreQuizAnswers(
  answerKeys: ReadonlyArray<{ id: number; correct_option: string }>,
  submittedAnswers: ReadonlyArray<SubmitAnswerInput>,
): {
  score: number;
  totalQuestions: number;
  questionIds: number[];
  selectedOptions: Array<string | null>;
  isCorrectFlags: boolean[];
} {
  const correctByQuestionId = new Map<number, string>();
  for (const row of answerKeys) {
    correctByQuestionId.set(row.id, row.correct_option);
  }

  const selectedByQuestionId = new Map<number, string | null>();
  for (const answer of submittedAnswers) {
    if (correctByQuestionId.has(answer.questionId)) {
      selectedByQuestionId.set(answer.questionId, answer.selectedOption);
    }
  }

  let score = 0;
  const questionIds: number[] = [];
  const selectedOptions: Array<string | null> = [];
  const isCorrectFlags: boolean[] = [];

  for (const [questionId, correctOption] of correctByQuestionId) {
    const selectedOption = selectedByQuestionId.get(questionId) ?? null;
    const isCorrect = selectedOption !== null && selectedOption === correctOption;
    if (isCorrect) {
      score += 1;
    }
    questionIds.push(questionId);
    selectedOptions.push(selectedOption);
    isCorrectFlags.push(isCorrect);
  }

  return {
    score,
    totalQuestions: correctByQuestionId.size,
    questionIds,
    selectedOptions,
    isCorrectFlags,
  };
}

export function scorePersonality(
  config: PersonalityConfig,
  ratings: Array<number | null>,
): PersonalityResult {
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

export function scorePauli(
  config: PauliConfig | null | undefined,
  rawPerColumn: ReadonlyArray<PauliColumnStat>,
): { score: number; totalQuestions: number; result: PauliResult } {
  const maxCols = typeof config?.columns === "number" && config.columns > 0 ? config.columns : 10;
  const maxPairs =
    typeof config?.digitsPerColumn === "number" ? Math.max(1, config.digitsPerColumn - 1) : 100;
  const perColumn = rawPerColumn.slice(0, maxCols).map((col, idx) => {
    const answered = Math.max(0, Math.min(col.answered, maxPairs));
    const correct = Math.max(0, Math.min(col.correct, answered));
    return { column: idx + 1, answered, correct };
  });
  const totalAnswered = perColumn.reduce((acc, col) => acc + col.answered, 0);
  const totalCorrect = perColumn.reduce((acc, col) => acc + col.correct, 0);
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return {
    score: totalCorrect,
    totalQuestions: totalAnswered,
    result: {
      kind: "PAULI",
      totalAnswered,
      totalCorrect,
      accuracy,
      perColumn,
    },
  };
}

export function scoreDrawing(
  config: DrawingConfig | null | undefined,
  rawDrawings: ReadonlyArray<DrawingSubmission>,
): { score: number; totalQuestions: number; result: DrawingResult } {
  const tasks = Array.isArray(config?.tasks) ? config.tasks : [];
  const drawings = rawDrawings.slice(0, tasks.length);
  const completed = drawings.filter((d) => d.dataUrl.startsWith("data:image/png;base64,")).length;

  return {
    score: completed,
    totalQuestions: tasks.length,
    result: {
      kind: "DRAWING",
      drawings,
      reflection: Array.isArray(config?.reflection) ? config.reflection : [],
    },
  };
}

const ATTEMPT_WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_WINDOW = 30;

// shortcut: rate limit per-instance di memori untuk menahan spam submit; pindahkan ke store bersama bila multi-instance diserang serentak
const attemptCountByIp = new Map<string, { count: number; resetAt: number }>();

export function checkAttemptRateLimit(
  ip: string,
  now = Date.now(),
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  for (const [key, entry] of attemptCountByIp) {
    if (entry.resetAt <= now) {
      attemptCountByIp.delete(key);
    }
  }
  const existing = attemptCountByIp.get(ip);
  if (!existing || existing.resetAt <= now) {
    attemptCountByIp.set(ip, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return { allowed: true };
  }
  if (existing.count >= MAX_ATTEMPTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { allowed: true };
}

export function resetAttemptRateLimitForTest(): void {
  attemptCountByIp.clear();
}
