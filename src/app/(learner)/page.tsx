import { LearnerDashboard } from "@/components/dashboard/LearnerDashboard";
import { getDashboardCatalog } from "@/lib/assessment/catalog.queries";

export const revalidate = 300;

export default async function HomePage() {
  const catalog = await getDashboardCatalog();
  const initialNowIso = new Date().toISOString();

  return <LearnerDashboard catalog={catalog} initialNowIso={initialNowIso} />;
}
