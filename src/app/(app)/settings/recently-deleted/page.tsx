import { requireUser } from "@/lib/permissions";
import { EmptyState, PermissionDeniedState } from "@/components/shell/states";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listRecentlyDeleted, deletableTypeLabel } from "@/lib/delete";
import { formatDate } from "@/lib/datetime";
import { addDays } from "date-fns";
import { RestoreButton } from "./restore-button";

/** Round 4 screen 36 (R4SetDeleted) — plain table, no filter tabs, one Restore action per row. */
export default async function SettingsRecentlyDeletedPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const rows = await listRecentlyDeleted(user.workspaceId);

  return (
    <div>
      <p className="mb-3.5 text-sm text-[var(--color-ink-subtle)]">Kept for 30 days, then removed for good. Admins only.</p>

      {rows.length === 0 ? (
        <EmptyState title="Nothing here" description="Deleted records show up here for 30 days before they're removed for good." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Deleted by</TableHead>
              <TableHead>Gone for good on</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.type}-${row.id}`}>
                <TableCell>{row.orgName ? `${row.orgName} · ${row.label}` : row.label}</TableCell>
                <TableCell>
                  <Badge tone="neutral">{deletableTypeLabel(row.type)}</Badge>
                </TableCell>
                <TableCell className="text-[var(--color-ink-subtle)]">
                  {row.archivedByName ? (row.archiveReason ? `${row.archivedByName} · ${row.archiveReason}` : row.archivedByName) : ""}
                </TableCell>
                <TableCell className="text-[var(--color-ink-subtle)]">{formatDate(addDays(row.archivedAt, 30))}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <RestoreButton type={row.type} id={row.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
