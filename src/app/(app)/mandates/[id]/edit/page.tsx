import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewMandate } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/shell/states";
import { PageHeader } from "@/components/shell/page-header";
import { MandateForm } from "../../mandate-form";
import { updateMandateAction } from "../../actions";

export default async function EditMandatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  if (!(await canViewMandate(user, id))) return <PermissionDeniedState description="This mandate is highly confidential and you are not assigned to it." />;

  const [mandate, organizations, people, users] = await Promise.all([
    prisma.mandate.findFirst({ where: { id, workspaceId: user.workspaceId } }),
    prisma.organization.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.person.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: { lastName: "asc" } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  if (!mandate) notFound();

  const boundAction = updateMandateAction.bind(null, mandate.id);

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${mandate.reference}`} />
      <MandateForm
        action={boundAction}
        organizations={organizations}
        people={people}
        users={users}
        currentUserId={user.id}
        submitLabel="Save changes"
        defaultValues={{
          title: mandate.title,
          hiringOrganizationId: mandate.hiringOrganizationId,
          priority: mandate.priority,
          confidentiality: mandate.confidentiality,
          ownerId: mandate.ownerId,
          hiringManagerPersonId: mandate.hiringManagerPersonId ?? "",
          internalTalentPersonId: mandate.internalTalentPersonId ?? "",
          seniority: mandate.seniority ?? "",
          employmentType: mandate.employmentType,
          numberOfHires: mandate.numberOfHires,
          city: mandate.city ?? "",
          workArrangement: mandate.workArrangement ?? "",
          roleSummary: mandate.roleSummary ?? "",
          businessContext: mandate.businessContext ?? "",
          requiredExperience: mandate.requiredExperience ?? "",
          minBaseAmount: mandate.minBaseAmount?.toString() ?? "",
          maxBaseAmount: mandate.maxBaseAmount?.toString() ?? "",
          baseCurrency: mandate.baseCurrency ?? "GBP",
          engagementModel: mandate.engagementModel,
          feeType: mandate.feeType,
          feePercentage: mandate.feePercentage?.toString() ?? "",
          signedTerms: mandate.signedTerms,
          targetShortlistDate: mandate.targetShortlistDate?.toISOString().slice(0, 10) ?? "",
          targetCompletionDate: mandate.targetCompletionDate?.toISOString().slice(0, 10) ?? "",
        }}
      />
    </div>
  );
}
