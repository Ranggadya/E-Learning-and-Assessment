import { notFound } from "next/navigation";
import { CompanyPackagesView } from "@/components/dashboard/CompanyPackagesView";
import { LearnerShell } from "@/components/layout/LearnerShell";
import { getCompanies, getDashboardCatalog } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface CompanyPageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { companySlug } = await params;
  const [companies, catalog] = await Promise.all([getCompanies(), getDashboardCatalog()]);
  const company = catalog.find((item) => item.slug === companySlug);
  if (!company) {
    notFound();
  }

  return (
    <LearnerShell companies={companies}>
      <CompanyPackagesView company={company} />
    </LearnerShell>
  );
}
