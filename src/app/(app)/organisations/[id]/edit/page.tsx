import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { OrganizationForm } from "../../organization-form";
import { updateOrganizationAction } from "../../actions";

export default async function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [org, users, ownershipTypes, sectors] = await Promise.all([
    prisma.organization.findFirst({ where: { id, workspaceId: user.workspaceId }, include: { sectors: true } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.ownershipType.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.sector.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
  ]);
  if (!org) notFound();

  const boundAction = updateOrganizationAction.bind(null, org.id);

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${org.name}`} />
      <OrganizationForm
        action={boundAction}
        users={users}
        ownershipTypes={ownershipTypes}
        sectors={sectors}
        submitLabel="Save changes"
        defaultValues={{
          name: org.name,
          type: org.type,
          status: org.status,
          website: org.website ?? "",
          linkedinUrl: org.linkedinUrl ?? "",
          hqCity: org.hqCity ?? "",
          hqRegion: org.hqRegion ?? "",
          hqCountryCode: org.hqCountryCode ?? "",
          employeeCountMin: org.employeeCountMin ?? "",
          employeeCountMax: org.employeeCountMax ?? "",
          description: org.description ?? "",
          internalSummary: org.internalSummary ?? "",
          accountPriority: org.accountPriority,
          relationshipOwnerId: org.relationshipOwnerId ?? "",
          source: org.source ?? "",
          sourceUrl: org.sourceUrl ?? "",
          ownershipTypeId: org.ownershipTypeId ?? "",
          sectorIds: org.sectors.map((s) => s.sectorId),
          fundVintageOrCurrentFundName: org.fundVintageOrCurrentFundName ?? "",
          aumAmount: org.aumAmount ?? "",
          aumCurrency: org.aumCurrency ?? "GBP",
          portfolioClassification: org.portfolioClassification ?? "",
          businessModelSummary: org.businessModelSummary ?? "",
          investmentThesisSummary: org.investmentThesisSummary ?? "",
        }}
      />
    </div>
  );
}
