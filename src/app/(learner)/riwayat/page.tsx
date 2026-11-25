import type { Metadata } from "next";
import { HistoryProgressView } from "@/components/dashboard/HistoryProgressView";
import { getDashboardCatalog } from "@/lib/assessment/catalog.queries";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Riwayat & Progres",
};

export default async function RiwayatPage() {
  const catalog = await getDashboardCatalog();
  return <HistoryProgressView catalog={catalog} />;
}
