import { notFound } from "next/navigation";
import { ResultReviewClient } from "@/components/result/ResultReviewClient";
import { getAttemptResult } from "@/lib/assessment/attempt.queries";
import { parsePgInt4Id } from "@/lib/format";

export const dynamic = "force-dynamic";

interface ResultPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { attemptId: attemptIdParam } = await params;
  const attemptId = parsePgInt4Id(attemptIdParam);
  if (attemptId === null) {
    notFound();
  }

  const result = await getAttemptResult(attemptId);
  if (!result) {
    notFound();
  }

  return <ResultReviewClient result={result} />;
}
