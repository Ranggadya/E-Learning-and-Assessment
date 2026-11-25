import type { Metadata } from "next";
import { EnglishQuizClient } from "@/components/materi/EnglishQuizClient";
import { isCefrLevel } from "@/lib/english/logic";
import { generateEnglishQuiz } from "@/lib/english/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kuis Kosakata · Materi Bahasa Inggris",
};

interface KuisPageProps {
  searchParams: Promise<{ cefr?: string }>;
}

export default async function KuisKamusPage({ searchParams }: KuisPageProps) {
  const sp = await searchParams;
  const initialCefr = sp.cefr && isCefrLevel(sp.cefr) ? sp.cefr : "";
  // Membaca pool kata dari unstable_cache (0 query DB setelah cache terisi), lalu mengacak 10 soal di memori server.
  const initialQuestions = await generateEnglishQuiz({
    cefr: initialCefr || undefined,
    count: 10,
  });

  return (
    <EnglishQuizClient
      initialCefr={initialCefr}
      initialQuestions={initialQuestions}
    />
  );
}
