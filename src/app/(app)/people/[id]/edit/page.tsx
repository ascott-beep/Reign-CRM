import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PersonForm } from "../../person-form";
import { updatePersonAction } from "../../actions";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [person, users, sectors] = await Promise.all([
    prisma.person.findFirst({ where: { id, workspaceId: user.workspaceId }, include: { currentOrganizationOverride: { select: { name: true } } } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.sector.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
  ]);
  if (!person) notFound();

  const boundAction = updatePersonAction.bind(null, person.id);

  return (
    <div>
      <PersonForm
        action={boundAction}
        users={users}
        sectors={sectors}
        presetOrganizationName={person.currentOrganizationOverride?.name}
        cancelHref={`/people/${person.id}`}
        submitLabel="Save changes"
        defaultValues={{
          firstName: person.firstName,
          lastName: person.lastName,
          preferredName: person.preferredName ?? "",
          pronouns: person.pronouns ?? "",
          primaryEmail: person.primaryEmail ?? "",
          secondaryEmail: person.secondaryEmail ?? "",
          primaryPhone: person.primaryPhone ?? "",
          linkedinUrl: person.linkedinUrl ?? "",
          city: person.city ?? "",
          region: person.region ?? "",
          countryCode: person.countryCode ?? "",
          personTypes: person.personTypes,
          personCategory: person.personCategory ?? "",
          relationshipStatus: person.relationshipStatus,
          relationshipOwnerId: person.relationshipOwnerId ?? "",
          headlineOverride: person.headlineOverride ?? "",
          currentOrganizationOverrideId: person.currentOrganizationOverrideId ?? "",
          source: person.source ?? "",
          sourceUrl: person.sourceUrl ?? "",
          summary: person.summary ?? "",
          doNotContact: person.doNotContact,
          doNotContactReason: person.doNotContactReason ?? "",
        }}
      />
    </div>
  );
}
