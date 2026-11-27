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

  const [mandate, people, users, allTags] = await Promise.all([
    prisma.mandate.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: { hiringOrganization: { select: { name: true } }, portfolioCompany: { select: { name: true } }, tags: { select: { tagId: true } } },
    }),
    prisma.person.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: { lastName: "asc" } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.tag.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!mandate) notFound();

  const boundAction = updateMandateAction.bind(null, mandate.id);

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${mandate.reference}`} description="Changes are saved to the audit log." />
      <MandateForm
        action={boundAction}
        people={people}
        users={users}
        allTags={allTags}
        currentUserId={user.id}
        submitLabel="Save changes"
        presetOrganizationId={mandate.hiringOrganizationId}
        presetOrganizationName={mandate.hiringOrganization.name}
        presetPortfolioCompanyId={mandate.portfolioCompanyId ?? undefined}
        presetPortfolioCompanyName={mandate.portfolioCompany?.name}
        lockedClientReason={mandate.sourceOpportunityId ? "Set when the opportunity was won" : undefined}
        defaultValues={{
          title: mandate.title,
          hiringOrganizationId: mandate.hiringOrganizationId,
          portfolioCompanyId: mandate.portfolioCompanyId ?? "",
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
          tagIds: mandate.tags.map((t) => t.tagId),
        }}
      />
    </div>
  );
}
