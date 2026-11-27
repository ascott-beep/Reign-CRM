import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { OpportunityForm } from "../opportunity-form";
import { createOpportunityAction } from "../actions";

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const user = await requireUser();
  const { organizationId } = await searchParams;
  const [presetOrganization, people, users] = await Promise.all([
    organizationId ? prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }) : null,
    prisma.person.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: { lastName: "asc" } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="New opportunity" description="A possible search we could win." />
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
