import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { OpportunityForm } from "../../opportunity-form";
import { updateOpportunityAction } from "../../actions";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [opportunity, people, users] = await Promise.all([
    prisma.opportunity.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: { hiringOrganization: { select: { name: true } }, portfolioCompany: { select: { name: true } } },
    }),
    prisma.person.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: { lastName: "asc" } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  if (!opportunity) notFound();

  const boundAction = updateOpportunityAction.bind(null, opportunity.id);

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${opportunity.name}`} />
      <OpportunityForm
        action={boundAction}
        people={people}
        users={users}
        currentUserId={user.id}
        submitLabel="Save changes"
        presetOrganizationId={opportunity.hiringOrganizationId}
        presetOrganizationName={opportunity.hiringOrganization.name}
        presetPortfolioCompanyId={opportunity.portfolioCompanyId ?? undefined}
        presetPortfolioCompanyName={opportunity.portfolioCompany?.name}
        defaultValues={{
          name: opportunity.name,
          hiringOrganizationId: opportunity.hiringOrganizationId,
          portfolioCompanyId: opportunity.portfolioCompanyId ?? "",
          stage: opportunity.stage,
          chanceOfWinning: opportunity.isProbabilityOverridden
            ? opportunity.probabilityOverride === 25
              ? "LOW"
              : opportunity.probabilityOverride === 75
                ? "HIGH"
                : "MEDIUM"
            : "MEDIUM",
          type: opportunity.type,
          potentialRoleTitle: opportunity.potentialRoleTitle ?? "",
          employmentType: opportunity.employmentType ?? "",
          source: opportunity.source,
          leadContactPersonId: opportunity.leadContactPersonId ?? "",
          ownerId: opportunity.ownerId,
          estimatedFeeAmount: opportunity.estimatedFeeAmount?.toString() ?? "",
          estimatedFeeCurrency: opportunity.estimatedFeeCurrency ?? "GBP",
          expectedDecisionDate: opportunity.expectedDecisionDate?.toISOString().slice(0, 10) ?? "",
          nextStepSummary: opportunity.nextStepSummary ?? "",
          notes: opportunity.notes ?? "",
        }}
      />
    </div>
  );
}
