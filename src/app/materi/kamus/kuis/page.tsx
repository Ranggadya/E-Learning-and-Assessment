import type { Metadata } from "next";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { EnglishQuizClient } from "@/components/materi/EnglishQuizClient";
import { isCefrLevel } from "@/lib/english";
import { getCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kuis Kosakata · Materi Bahasa Inggris",
};

interface KuisPageProps {
  searchParams: Promise<{ cefr?: string }>;
}

export default async function KuisKamusPage({ searchParams }: KuisPageProps) {
  const [companies, sp] = await Promise.all([getCompanies(), searchParams]);
  const initialCefr = sp.cefr && isCefrLevel(sp.cefr) ? sp.cefr : "";

  return (
    <LearnerShell companies={companies}>
      <EnglishQuizClient initialCefr={initialCefr} />
    </LearnerShell>
  );
}
