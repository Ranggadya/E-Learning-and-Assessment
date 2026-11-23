import type { Metadata } from "next";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { MateriOverviewClient } from "@/components/materi/MateriOverviewClient";
import { getEnglishProgressOverview } from "@/lib/english/queries";
import { getCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Materi Bahasa Inggris",
};

export default async function MateriPage() {
  const [companies, initialOverview] = await Promise.all([
    getCompanies(),
    getEnglishProgressOverview(null),
  ]);

  return (
    <LearnerShell companies={companies}>
      <MateriOverviewClient initialOverview={initialOverview} />
    </LearnerShell>
  );
}
