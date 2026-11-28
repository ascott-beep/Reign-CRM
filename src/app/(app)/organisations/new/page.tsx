import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { CreatedToast } from "@/components/shell/created-toast";
import { OrganizationForm } from "../organization-form";
import { createOrganizationAction } from "../actions";

export default async function NewOrganizationPage() {
  const user = await requireUser();
  const [users, sectors, investorStrategies] = await Promise.all([
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.sector.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.investorStrategy.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
  ]);

  return (
    <div>
      <CreatedToast />
      <OrganizationForm action={createOrganizationAction} users={users} sectors={sectors} investorStrategies={investorStrategies} />
    </div>
  );
}
