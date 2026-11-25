import { notFound } from "next/navigation";
import { CompanyPackagesView } from "@/components/dashboard/CompanyPackagesView";
import { getDashboardCatalog } from "@/lib/assessment/catalog.queries";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

interface CompanyPageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { companySlug } = await params;
  const catalog = await getDashboardCatalog();
  const company = catalog.find((item) => item.slug === companySlug);
  if (!company) {
    notFound();
  }

  return <CompanyPackagesView company={company} />;
}
