import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { PersonForm } from "../person-form";
import { createPersonAction } from "../actions";

export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const user = await requireUser();
  const { organizationId } = await searchParams;
  const [users, organizations] = await Promise.all([
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.organization.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="New person" description="Add a candidate, client contact, investor, or other relationship." />
      <PersonForm action={createPersonAction} users={users} organizations={organizations} presetOrganizationId={organizationId} />
    </div>
  );
}
