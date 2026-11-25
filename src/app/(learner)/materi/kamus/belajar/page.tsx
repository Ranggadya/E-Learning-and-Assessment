import type { Metadata } from "next";
import { cookies } from "next/headers";
import { FlashcardStudyClient } from "@/components/materi/FlashcardStudyClient";
import { ANON_USER_COOKIE } from "@/lib/english/constants";
import { isCefrLevel, isValidAnonUserId } from "@/lib/english/logic";
import { getStudyQueue } from "@/lib/english/queries";
import type { CefrLevel } from "@/types/english";

export const metadata: Metadata = {
  title: "Belajar Kartu (Flashcard) · Kamus Inggris",
};

interface BelajarPageProps {
  searchParams: Promise<{ cefr?: string }>;
}

export default async function BelajarKamusPage({ searchParams }: BelajarPageProps) {
  const [cookieStore, sp] = await Promise.all([cookies(), searchParams]);
  const initialCefr: CefrLevel | "" = sp.cefr && isCefrLevel(sp.cefr) ? sp.cefr : "";
  const rawUserId = cookieStore.get(ANON_USER_COOKIE)?.value ?? null;
  const validUserId = isValidAnonUserId(rawUserId) ? rawUserId : null;

  const initialStudyData = validUserId
    ? {
        userId: validUserId,
        cefr: initialCefr,
        newLimit: 10,
        ...(await getStudyQueue({
          userId: validUserId,
          cefr: initialCefr || undefined,
          newLimit: 10,
        })),
      }
    : null;

  return (
    <FlashcardStudyClient
      initialCefr={initialCefr}
      initialStudyData={initialStudyData}
    />
  );
}
