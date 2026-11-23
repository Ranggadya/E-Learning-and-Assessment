import { LearnerDashboard } from "@/components/dashboard/LearnerDashboard";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { getDashboardCatalog } from "@/lib/assessment/catalog.queries";
import { catalogToCompanies } from "@/lib/assessment/dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getDashboardCatalog();
  const companies = catalogToCompanies(catalog);

  return (
    <LearnerShell companies={companies}>
      <LearnerDashboard catalog={catalog} />
    </LearnerShell>
  );
}
