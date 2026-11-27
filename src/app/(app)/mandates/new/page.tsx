import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { MandateForm } from "../mandate-form";
import { createMandateAction } from "../actions";

export default async function NewMandatePage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const user = await requireUser();
  const { organizationId } = await searchParams;
  const [presetOrganization, people, users, allTags] = await Promise.all([
    organizationId ? prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }) : null,
    prisma.person.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: { lastName: "asc" } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.tag.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="New mandate" description="Open a confirmed recruitment mandate." />
      <MandateForm
        action={createMandateAction}
        people={people}
        users={users}
        allTags={allTags}
        currentUserId={user.id}
        presetOrganizationId={organizationId}
        presetOrganizationName={presetOrganization?.name}
      />
    </div>
  );
}
