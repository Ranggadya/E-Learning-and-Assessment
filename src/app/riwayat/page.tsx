import type { Metadata } from "next";
import { HistoryProgressView } from "@/components/dashboard/HistoryProgressView";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { getCompanies, getDashboardCatalog } from "@/lib/assessment/catalog.queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Riwayat & Progres",
};

export default async function RiwayatPage() {
  const [companies, catalog] = await Promise.all([getCompanies(), getDashboardCatalog()]);

  return (
    <LearnerShell companies={companies}>
      <HistoryProgressView catalog={catalog} />
    </LearnerShell>
  );
}
