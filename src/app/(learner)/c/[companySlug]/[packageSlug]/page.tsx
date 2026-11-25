import { notFound } from "next/navigation";
import { PackageSubtestsView } from "@/components/dashboard/PackageSubtestsView";
import { getPackageDetailBySlugs } from "@/lib/assessment/catalog.queries";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

interface PackagePageProps {
  params: Promise<{ companySlug: string; packageSlug: string }>;
}

export default async function PackagePage({ params }: PackagePageProps) {
  const { companySlug, packageSlug } = await params;
  const detail = await getPackageDetailBySlugs(companySlug, packageSlug);
  if (!detail) {
    notFound();
  }

  return (
    <PackageSubtestsView
      company={detail.company}
      testPackage={detail.testPackage}
      subtests={detail.subtests}
    />
  );
}
