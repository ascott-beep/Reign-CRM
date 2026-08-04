import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { TaskForm } from "../task-form";

type LinkParams = {
  organizationId?: string;
  personId?: string;
  opportunityId?: string;
  mandateId?: string;
  candidateProcessId?: string;
  intelligenceItemId?: string;
};

async function resolveLinkLabel(params: LinkParams): Promise<string | undefined> {
  if (params.organizationId) return (await prisma.organization.findUnique({ where: { id: params.organizationId }, select: { name: true } }))?.name;
  if (params.personId) {
    const p = await prisma.person.findUnique({ where: { id: params.personId }, select: { firstName: true, lastName: true } });
    return p ? `${p.firstName} ${p.lastName}` : undefined;
  }
  if (params.opportunityId) return (await prisma.opportunity.findUnique({ where: { id: params.opportunityId }, select: { name: true } }))?.name;
  if (params.mandateId) {
    const m = await prisma.mandate.findUnique({ where: { id: params.mandateId }, select: { reference: true, title: true } });
    return m ? `${m.reference} — ${m.title}` : undefined;
  }
  if (params.intelligenceItemId) return (await prisma.intelligenceItem.findUnique({ where: { id: params.intelligenceItemId }, select: { title: true } }))?.title;
  return undefined;
}

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<LinkParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const [users, linkLabel] = await Promise.all([
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    resolveLinkLabel(params),
  ]);

  return (
    <div className="max-w-xl">
      <PageHeader title="New task" />
      <TaskForm users={users} currentUserId={user.id} linkContext={params} linkLabel={linkLabel} />
    </div>
  );
}
