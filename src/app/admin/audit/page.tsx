import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AuditLogView } from "@/components/admin/AuditLogView";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { listAuditLogs } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  if (!isAdminConfigured() || !(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const { logs, migrationRequired } = await listAuditLogs(100);

  return (
    <AdminShell activeNav="audit">
      <AuditLogView logs={logs} migrationRequired={migrationRequired} />
    </AdminShell>
  );
}
