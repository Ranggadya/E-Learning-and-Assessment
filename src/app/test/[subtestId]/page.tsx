import { notFound } from "next/navigation";
import { TestRunner } from "@/components/TestRunner";
import { getPublicQuestions, getSubtestById } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface TestPageProps {
  params: Promise<{ subtestId: string }>;
}

export default async function TestPage({ params }: TestPageProps) {
  const { subtestId: subtestIdParam } = await params;
  const subtestId = Number(subtestIdParam);
  if (!Number.isInteger(subtestId)) {
    notFound();
  }

  const subtest = await getSubtestById(subtestId);
  if (!subtest) {
    notFound();
  }
  const questions = await getPublicQuestions(subtestId);

  return (
    <TestRunner
      subtestId={subtest.id}
      subtestName={subtest.name}
      durationSeconds={subtest.durationSeconds}
      questions={questions}
    />
  );
}
