import type { Metadata } from "next";
import { HistoryProgressView } from "@/components/dashboard/HistoryProgressView";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { getDashboardCatalog } from "@/lib/assessment/catalog.queries";
import { catalogToCompanies } from "@/lib/assessment/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Riwayat & Progres",
};

export default async function RiwayatPage() {
  const catalog = await getDashboardCatalog();
  const companies = catalogToCompanies(catalog);

  return (
    <LearnerShell companies={companies}>
      <HistoryProgressView catalog={catalog} />
    </LearnerShell>
  );
}
