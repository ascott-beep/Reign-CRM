import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { CreatedToast } from "@/components/shell/created-toast";
import { OrganizationForm } from "../organization-form";
import { createOrganizationAction } from "../actions";

export default async function NewOrganizationPage() {
  const user = await requireUser();
  const [users, ownershipTypes, sectors] = await Promise.all([
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.ownershipType.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.sector.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
  ]);

  return (
    <div>
      <CreatedToast />
      <PageHeader title="New organisation" description="Type a name and press Research to fill the rest from the web." />
      <OrganizationForm action={createOrganizationAction} users={users} ownershipTypes={ownershipTypes} sectors={sectors} />
    </div>
  );
}
