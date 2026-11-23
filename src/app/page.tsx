import { LearnerDashboard } from "@/components/dashboard/LearnerDashboard";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { getCompanies, getDashboardCatalog } from "@/lib/assessment/catalog.queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [companies, catalog] = await Promise.all([getCompanies(), getDashboardCatalog()]);

  return (
    <LearnerShell companies={companies}>
      <LearnerDashboard catalog={catalog} />
    </LearnerShell>
  );
}
