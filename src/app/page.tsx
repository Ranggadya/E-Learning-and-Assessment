import { DashboardRightPanel } from "@/components/dashboard/DashboardRightPanel";
import { LearnerDashboard } from "@/components/dashboard/LearnerDashboard";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { getDashboardCatalog } from "@/lib/assessment/catalog.queries";
import { catalogToCompanies } from "@/lib/assessment/dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getDashboardCatalog();
  const companies = catalogToCompanies(catalog);
  const initialNowIso = new Date().toISOString();

  return (
    <LearnerShell
      companies={companies}
      rightRail={<DashboardRightPanel catalog={catalog} initialNowIso={initialNowIso} />}
    >
      <LearnerDashboard catalog={catalog} initialNowIso={initialNowIso} />
    </LearnerShell>
  );
}
