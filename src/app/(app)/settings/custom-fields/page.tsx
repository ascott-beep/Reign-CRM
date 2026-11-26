import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { EmptyState } from "@/components/shell/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { CreateCustomFieldDialog } from "../settings-dialogs";

export default async function SettingsCustomFieldsPage() {
  const user = await requireUser();
  const customFields = await prisma.customFieldDefinition.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <CreateCustomFieldDialog />
      </div>
      {customFields.length === 0 ? (
        <EmptyState title="No custom fields defined" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customFields.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.label}</TableCell>
                <TableCell>{label(f.entityType)}</TableCell>
                <TableCell>{label(f.fieldType)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
