import { notFound } from "next/navigation";
import { DrawingRunner } from "@/components/test/DrawingRunner";
import { PauliRunner } from "@/components/test/PauliRunner";
import { PersonalityRunner } from "@/components/test/PersonalityRunner";
import { TestRunner } from "@/components/test/TestRunner";
import { getPublicQuestions, getSubtestById } from "@/lib/assessment/catalog.queries";
import { parsePgInt4Id } from "@/lib/format";
import type { DrawingConfig, PauliConfig, PersonalityConfig } from "@/types/assessment";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

interface TestPageProps {
  params: Promise<{ subtestId: string }>;
}

export default async function TestPage({ params }: TestPageProps) {
  const { subtestId: subtestIdParam } = await params;
  const subtestId = parsePgInt4Id(subtestIdParam);
  if (subtestId === null) {
    notFound();
  }

  const subtest = await getSubtestById(subtestId);
  if (!subtest) {
    notFound();
  }
  const backHref = `/c/${subtest.companySlug}/${subtest.packageSlug}`;

  if (subtest.kind === "PERSONALITY" && subtest.config) {
    return (
      <PersonalityRunner
        subtestId={subtest.id}
        subtestName={subtest.name}
        companyName={subtest.companyName}
        packageName={subtest.packageName}
        backHref={backHref}
        durationSeconds={subtest.durationSeconds}
        config={subtest.config as PersonalityConfig}
      />
    );
  }

  if (subtest.kind === "PAULI" && subtest.config) {
    return (
      <PauliRunner
        subtestId={subtest.id}
        subtestName={subtest.name}
        companyName={subtest.companyName}
        packageName={subtest.packageName}
        backHref={backHref}
        config={subtest.config as PauliConfig}
      />
    );
  }

  if (subtest.kind === "DRAWING" && subtest.config) {
    return (
      <DrawingRunner
        subtestId={subtest.id}
        subtestName={subtest.name}
        companyName={subtest.companyName}
        packageName={subtest.packageName}
        backHref={backHref}
        config={subtest.config as DrawingConfig}
      />
    );
  }

  const questions = await getPublicQuestions(subtestId);
  return (
    <TestRunner
      subtestId={subtest.id}
      subtestName={subtest.name}
      companyName={subtest.companyName}
      packageName={subtest.packageName}
      backHref={backHref}
      durationSeconds={subtest.durationSeconds}
      questions={questions}
    />
  );
}
