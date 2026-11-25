import { LearnerShell } from "@/components/layout/LearnerShell";
import { getDashboardCatalog } from "@/lib/assessment/catalog.queries";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalog = await getDashboardCatalog();
  const initialNowIso = new Date().toISOString();

  return (
    <LearnerShell catalog={catalog} initialNowIso={initialNowIso}>
      {children}
    </LearnerShell>
  );
}
