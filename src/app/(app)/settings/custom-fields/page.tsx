import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { EmptyState, PermissionDeniedState } from "@/components/shell/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { CreateCustomFieldDialog } from "../settings-dialogs";

export default async function SettingsCustomFieldsPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const customFields = await prisma.customFieldDefinition.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--color-ink-subtle)]">Extra fields that show under More details.</p>
        <CreateCustomFieldDialog />
      </div>
      {customFields.length === 0 ? (
        <EmptyState title="No custom fields yet" description="Add one to collect extra detail on people, organisations, opportunities or mandates." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Shows on</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customFields.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium text-[var(--color-ink)]">{f.label}</TableCell>
                <TableCell>{label(f.fieldType)}</TableCell>
                <TableCell>{label(f.entityType)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
