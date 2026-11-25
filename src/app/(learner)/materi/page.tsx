import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MateriOverviewClient } from "@/components/materi/MateriOverviewClient";
import { ANON_USER_COOKIE } from "@/lib/english/constants";
import { isValidAnonUserId } from "@/lib/english/logic";
import { getEnglishProgressOverview } from "@/lib/english/queries";

export const metadata: Metadata = {
  title: "Materi Bahasa Inggris",
};

export default async function MateriPage() {
  const cookieStore = await cookies();
  const rawUserId = cookieStore.get(ANON_USER_COOKIE)?.value ?? null;
  const validUserId = isValidAnonUserId(rawUserId) ? rawUserId : null;
  const initialOverview = await getEnglishProgressOverview(validUserId);

  return (
    <MateriOverviewClient
      initialOverview={initialOverview}
      initialUserId={validUserId}
    />
  );
}
