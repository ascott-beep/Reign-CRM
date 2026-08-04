import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { IntelligenceForm } from "../intelligence-form";

export default async function NewIntelligencePage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const user = await requireUser();
  const { organizationId } = await searchParams;
  const [organizations, people, users] = await Promise.all([
    prisma.organization.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.person.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: { lastName: "asc" } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="New intelligence item" description="Capture a hiring signal or market insight." />
      <IntelligenceForm organizations={organizations} people={people} users={users} currentUserId={user.id} presetOrganizationId={organizationId} />
    </div>
  );
}
