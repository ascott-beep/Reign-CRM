import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { ActivityForm } from "../activity-form";

type LinkParams = {
  organizationId?: string;
  personId?: string;
  opportunityId?: string;
  mandateId?: string;
  candidateProcessId?: string;
  intelligenceItemId?: string;
};

async function resolveLinkLabel(params: LinkParams): Promise<string | undefined> {
  if (params.organizationId) {
    const o = await prisma.organization.findUnique({ where: { id: params.organizationId }, select: { name: true } });
    return o?.name;
  }
  if (params.personId) {
    const p = await prisma.person.findUnique({ where: { id: params.personId }, select: { firstName: true, lastName: true } });
    return p ? `${p.firstName} ${p.lastName}` : undefined;
  }
  if (params.opportunityId) {
    const o = await prisma.opportunity.findUnique({ where: { id: params.opportunityId }, select: { name: true } });
    return o?.name;
  }
  if (params.mandateId) {
    const m = await prisma.mandate.findUnique({ where: { id: params.mandateId }, select: { reference: true, title: true } });
    return m ? `${m.reference} — ${m.title}` : undefined;
  }
  if (params.intelligenceItemId) {
    const i = await prisma.intelligenceItem.findUnique({ where: { id: params.intelligenceItemId }, select: { title: true } });
    return i?.title;
  }
  return undefined;
}

export default async function NewActivityPage({ searchParams }: { searchParams: Promise<LinkParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const [users, linkLabel] = await Promise.all([
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    resolveLinkLabel(params),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Log activity" description="Record a call, meeting, message or note." />
      <ActivityForm users={users} currentUserId={user.id} linkContext={{ ...params, label: linkLabel }} />
    </div>
  );
}
