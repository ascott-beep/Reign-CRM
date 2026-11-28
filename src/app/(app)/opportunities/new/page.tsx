import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { label } from "@/lib/labels";
import { OpportunityForm } from "../opportunity-form";
import { createOpportunityAction } from "../actions";

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const user = await requireUser();
  const { organizationId } = await searchParams;
  const [presetOrganization, peopleRows, users] = await Promise.all([
    organizationId ? prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }) : null,
    prisma.person.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null },
      select: { id: true, firstName: true, lastName: true, clientContactProfile: { select: { roleAtFirm: true } } },
      orderBy: { lastName: "asc" },
    }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  const people = peopleRows.map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, roleAtFirmLabel: p.clientContactProfile?.roleAtFirm ? label(p.clientContactProfile.roleAtFirm) : null }));

  return (
    <div>
      <OpportunityForm
        action={createOpportunityAction}
        people={people}
        users={users}
        currentUserId={user.id}
        presetOrganizationId={organizationId}
        presetOrganizationName={presetOrganization?.name}
      />
    </div>
  );
}
