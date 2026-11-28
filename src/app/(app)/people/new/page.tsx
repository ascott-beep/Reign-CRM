import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { CreatedToast } from "@/components/shell/created-toast";
import { PersonForm } from "../person-form";
import { createPersonAction } from "../actions";

export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const user = await requireUser();
  const { organizationId } = await searchParams;
  const [users, sectors, presetOrganization] = await Promise.all([
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.sector.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
    organizationId ? prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }) : null,
  ]);

  return (
    <div>
      <CreatedToast />
      <PersonForm
        action={createPersonAction}
        users={users}
        sectors={sectors}
        presetOrganizationId={organizationId}
        presetOrganizationName={presetOrganization?.name}
      />
    </div>
  );
}
