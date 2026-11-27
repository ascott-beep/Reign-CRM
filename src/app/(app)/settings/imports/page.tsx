import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { EmptyState, PermissionDeniedState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { formatDateTime } from "@/lib/datetime";

export default async function SettingsImportsPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const importJobs = await prisma.importJob.findMany({
    where: { workspaceId: user.workspaceId },
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (importJobs.length === 0) {
    return (
      <EmptyState
        title="No imports yet"
        action={
          <div className="mt-2 flex gap-2">
            <Button size="sm" asChild>
              <Link href="/import/organisations">Import organisations</Link>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href="/import/people">Import people</Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Rows</TableHead>
          <TableHead>Success / Error</TableHead>
          <TableHead>By</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {importJobs.map((j) => (
          <TableRow key={j.id}>
            <TableCell>{j.originalFilename}</TableCell>
            <TableCell>{label(j.entityType)}</TableCell>
            <TableCell>{j.totalRows}</TableCell>
            <TableCell>
              {j.successRows} / {j.errorRows}
            </TableCell>
            <TableCell>{j.createdBy.firstName} {j.createdBy.lastName}</TableCell>
            <TableCell>{formatDateTime(j.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
