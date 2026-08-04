import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { OpportunityForm } from "../opportunity-form";
import { createOpportunityAction } from "../actions";

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const user = await requireUser();
  const { organizationId } = await searchParams;
  const [organizations, people, users] = await Promise.all([
    prisma.organization.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.person.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: { lastName: "asc" } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="New opportunity" description="Track possible work before it becomes a confirmed mandate." />
      <OpportunityForm
        action={createOpportunityAction}
        organizations={organizations}
        people={people}
        users={users}
        currentUserId={user.id}
        presetOrganizationId={organizationId}
      />
    </div>
  );
}
