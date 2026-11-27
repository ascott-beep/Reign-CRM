import { prisma } from "@/lib/prisma";
import { requireUser, canViewAuditLog } from "@/lib/permissions";
import { EmptyState, PermissionDeniedState } from "@/components/shell/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { format } from "date-fns";

export default async function SettingsAuditLogPage() {
  const user = await requireUser();
  if (!canViewAuditLog(user.role)) return <PermissionDeniedState description="This page is administrator-only." />;
  const auditLogs = await prisma.auditLog.findMany({
    where: { workspaceId: user.workspaceId },
    include: { actor: true },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  if (auditLogs.length === 0) return <EmptyState title="No audit history yet" />;

  return (
    <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-[var(--color-border)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entity</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditLogs.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.entityType}</TableCell>
              <TableCell>{label(a.action)}</TableCell>
              <TableCell>{a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : "System"}</TableCell>
              <TableCell>{format(a.timestamp, "d MMM yyyy HH:mm")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
