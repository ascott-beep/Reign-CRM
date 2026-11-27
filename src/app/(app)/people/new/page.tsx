import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
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
  const [users, presetOrganization] = await Promise.all([
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    organizationId ? prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }) : null,
  ]);

  return (
    <div>
      <CreatedToast />
      <PageHeader title="New person" description="Only the name is needed. Add the rest now or later." />
      <PersonForm
        action={createPersonAction}
        users={users}
        presetOrganizationId={organizationId}
        presetOrganizationName={presetOrganization?.name}
      />
    </div>
  );
}
