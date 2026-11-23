import type { Metadata } from "next";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { FlashcardStudyClient } from "@/components/materi/FlashcardStudyClient";
import { isCefrLevel } from "@/lib/english";
import { getCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Belajar Kartu (Flashcard) · Kamus Inggris",
};

interface BelajarPageProps {
  searchParams: Promise<{ cefr?: string }>;
}

export default async function BelajarKamusPage({ searchParams }: BelajarPageProps) {
  const [companies, sp] = await Promise.all([getCompanies(), searchParams]);
  const initialCefr = sp.cefr && isCefrLevel(sp.cefr) ? sp.cefr : "";

  return (
    <LearnerShell companies={companies}>
      <FlashcardStudyClient initialCefr={initialCefr} />
    </LearnerShell>
  );
}
