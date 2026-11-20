import { notFound } from "next/navigation";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { ResultReviewClient } from "@/components/result/ResultReviewClient";
import { getAttemptResult, getCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface ResultPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { attemptId: attemptIdParam } = await params;
  const attemptId = Number(attemptIdParam);
  if (!Number.isInteger(attemptId)) {
    notFound();
  }

  const [companies, result] = await Promise.all([getCompanies(), getAttemptResult(attemptId)]);
  if (!result) {
    notFound();
  }

  return (
    <LearnerShell companies={companies}>
      <ResultReviewClient result={result} />
    </LearnerShell>
  );
}
