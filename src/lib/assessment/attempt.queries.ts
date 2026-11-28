import { databasePool } from "@/lib/db/pool";
import type {
  AttemptResult,
  DrawingConfig,
  NonQuizResult,
  PauliConfig,
  PersonalityConfig,
  QuestionOption,
  ReviewItem,
  SubmitAttemptInput,
  SubmitNonQuizInput,
  SubtestKind,
} from "@/types/assessment";
import { scoreDrawing, scorePauli, scorePersonality, scoreQuizAnswers } from "./scoring";

interface AnswerKeyRow {
  id: number;
  correct_option: string;
}

// Menilai di server: memvalidasi subtes QUIZ terlebih dahulu lalu membaca kunci jawaban dari database.
export async function submitAttempt(input: SubmitAttemptInput): Promise<number | null> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");

    const subtestCheck = await client.query<{ kind: SubtestKind | null }>(
      "SELECT kind FROM subtests WHERE id = $1",
      [input.subtestId],
    );
    const subtestRow = subtestCheck.rows[0];
    if (!subtestRow || (subtestRow.kind ?? "QUIZ") !== "QUIZ") {
      await client.query("ROLLBACK");
      return null;
    }

    const answerKeyResult = await client.query<AnswerKeyRow>(
      "SELECT id, correct_option FROM questions WHERE subtest_id = $1",
      [input.subtestId],
    );
    const graded = scoreQuizAnswers(answerKeyResult.rows, input.answers);

    const attemptResult = await client.query<{ id: number }>(
      `INSERT INTO attempts (subtest_id, score, total_questions, finished_at)
       VALUES ($1, $2, $3, now()) RETURNING id`,
      [input.subtestId, graded.score, graded.totalQuestions],
    );
    const attemptId = attemptResult.rows[0].id;

    if (graded.questionIds.length > 0) {
      await client.query(
        `INSERT INTO answers (attempt_id, question_id, selected_option, is_correct)
         SELECT $1, * FROM UNNEST($2::int[], $3::text[], $4::bool[])`,
        [attemptId, graded.questionIds, graded.selectedOptions, graded.isCorrectFlags],
      );
    }

    await client.query("COMMIT");
    return attemptId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function submitNonQuizAttempt(input: SubmitNonQuizInput): Promise<number | null> {
  const subtestResult = await databasePool.query<{ kind: SubtestKind; config: unknown }>(
    "SELECT kind, config FROM subtests WHERE id = $1",
    [input.subtestId],
  );
  const subtestRow = subtestResult.rows[0];
  if (!subtestRow || subtestRow.kind !== input.kind) {
    return null;
  }

  let score = 0;
  let totalQuestions = 0;
  let resultPayload: NonQuizResult;

  if (input.kind === "PERSONALITY") {
    const scored = scorePersonality(subtestRow.config as PersonalityConfig, input.ratings);
    score = scored.answered;
    totalQuestions = scored.total;
    resultPayload = scored;
  } else if (input.kind === "PAULI") {
    const scored = scorePauli(subtestRow.config as PauliConfig, input.perColumn);
    score = scored.score;
    totalQuestions = scored.totalQuestions;
    resultPayload = scored.result;
  } else {
    const scored = scoreDrawing(subtestRow.config as DrawingConfig, input.drawings);
    score = scored.score;
    totalQuestions = scored.totalQuestions;
    resultPayload = scored.result;
  }

  const inserted = await databasePool.query<{ id: number }>(
    `INSERT INTO attempts (subtest_id, score, total_questions, finished_at, result)
     VALUES ($1, $2, $3, now(), $4::jsonb) RETURNING id`,
    [input.subtestId, score, totalQuestions, JSON.stringify(resultPayload)],
  );
  return inserted.rows[0].id;
}

interface ReviewRow {
  question_id: number;
  order_index: number;
  prompt: string;
  image_svg: string | null;
  options: QuestionOption[];
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
  explanation: string | null;
  steps: string[] | null;
  wrong_notes: string[] | null;
  quick_tip: string | null;
}

export async function getAttemptResult(attemptId: number): Promise<AttemptResult | null> {
  const attemptResult = await databasePool.query<{
    id: number;
    subtest_id: number;
    score: number | null;
    total_questions: number | null;
    finished_at: Date | string | null;
    result: NonQuizResult | null;
    subtest_name: string;
    subtest_kind: SubtestKind | null;
    package_slug: string;
    package_name: string;
    company_slug: string;
    company_name: string;
  }>(
    `SELECT a.id, a.subtest_id, a.score, a.total_questions, a.finished_at, a.result,
            s.name AS subtest_name, s.kind AS subtest_kind,
            p.slug AS package_slug, p.name AS package_name,
            c.slug AS company_slug, c.name AS company_name
     FROM attempts a
     JOIN subtests s ON s.id = a.subtest_id
     JOIN test_packages p ON p.id = s.test_package_id
     JOIN companies c ON c.id = p.company_id
     WHERE a.id = $1`,
    [attemptId],
  );
  const attemptRow = attemptResult.rows[0];
  if (!attemptRow) {
    return null;
  }

  const reviewResult = await databasePool.query<ReviewRow>(
    `SELECT q.id AS question_id, q.order_index, q.prompt, q.image_svg, q.options,
            an.selected_option, q.correct_option, an.is_correct, q.explanation,
            q.steps, q.wrong_notes, q.quick_tip
     FROM answers an
     JOIN questions q ON q.id = an.question_id
     WHERE an.attempt_id = $1
     ORDER BY q.order_index`,
    [attemptId],
  );

  const reviewItems: ReviewItem[] = reviewResult.rows.map(function mapReview(row) {
    return {
      questionId: row.question_id,
      orderIndex: row.order_index,
      prompt: row.prompt,
      imageSvg: row.image_svg,
      options: row.options,
      selectedOption: row.selected_option,
      correctOption: row.correct_option,
      isCorrect: row.is_correct,
      explanation: row.explanation,
      steps: row.steps,
      wrongNotes: row.wrong_notes,
      quickTip: row.quick_tip,
    };
  });

  const finishedAt =
    attemptRow.finished_at instanceof Date
      ? attemptRow.finished_at.toISOString()
      : attemptRow.finished_at ?? null;

  return {
    attemptId: attemptRow.id,
    subtestId: attemptRow.subtest_id,
    subtestName: attemptRow.subtest_name,
    subtestKind: attemptRow.subtest_kind ?? "QUIZ",
    companySlug: attemptRow.company_slug,
    companyName: attemptRow.company_name,
    packageSlug: attemptRow.package_slug,
    packageName: attemptRow.package_name,
    score: attemptRow.score ?? 0,
    totalQuestions: attemptRow.total_questions ?? 0,
    finishedAt,
    reviewItems,
    result: attemptRow.result ?? null,
  };
}
