import { notFound } from "next/navigation";
import { PackageSubtestsView } from "@/components/dashboard/PackageSubtestsView";
import { LearnerShell } from "@/components/layout/LearnerShell";
import {
  getCompanies,
  getCompanyBySlug,
  getPackageBySlugs,
  getSubtestsByPackageId,
} from "@/lib/assessment/catalog.queries";

export const dynamic = "force-dynamic";

interface PackagePageProps {
  params: Promise<{ companySlug: string; packageSlug: string }>;
}

export default async function PackagePage({ params }: PackagePageProps) {
  const { companySlug, packageSlug } = await params;
  const [companies, company, testPackage] = await Promise.all([
    getCompanies(),
    getCompanyBySlug(companySlug),
    getPackageBySlugs(companySlug, packageSlug),
  ]);
  if (!company || !testPackage) {
    notFound();
  }
  const subtests = await getSubtestsByPackageId(testPackage.id);

  return (
    <LearnerShell companies={companies}>
      <PackageSubtestsView company={company} testPackage={testPackage} subtests={subtests} />
    </LearnerShell>
  );
}
