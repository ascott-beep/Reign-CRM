import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightCircle, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { label } from "@/lib/labels";
import { format } from "date-fns";
import { convertIntelligenceToOpportunityAction, verifyIntelligenceAction } from "../actions";

export default async function IntelligenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const item = await prisma.intelligenceItem.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: { organization: true, owner: true, createdBy: true, sourcePerson: true, verifiedBy: true, convertedOpportunity: true },
  });
  if (!item) notFound();

  const canConvert = (item.commercialRelevance === "HIGH" || item.commercialRelevance === "IMMEDIATE") && !item.convertedOpportunityId;

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            {item.title}
            <Badge tone={item.commercialRelevance === "IMMEDIATE" || item.commercialRelevance === "HIGH" ? "warning" : "neutral"}>{label(item.commercialRelevance)}</Badge>
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={`/organisations/${item.organizationId}`} className="text-[var(--color-accent)]">
              {item.organization.name}
            </Link>
            <span>{label(item.type)}</span>
            <span>Owner: {item.owner.firstName} {item.owner.lastName}</span>
          </div>
        }
        actions={
          <>
            {item.confidence !== "VERIFIED" ? (
              <form action={verifyIntelligenceAction.bind(null, item.id)}>
                <Button type="submit" variant="secondary" size="sm">
                  <ShieldCheck className="h-4 w-4" /> Mark verified
                </Button>
              </form>
            ) : null}
            {canConvert ? (
              <form action={convertIntelligenceToOpportunityAction.bind(null, item.id)}>
                <Button type="submit">
                  <ArrowRightCircle className="h-4 w-4" /> Convert to Opportunity
                </Button>
              </form>
            ) : null}
            {item.convertedOpportunityId ? (
              <Button variant="secondary" asChild>
                <Link href={`/opportunities/${item.convertedOpportunityId}`}>View Opportunity</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            <h3 className="mb-2 text-sm font-semibold">Details</h3>
            <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{item.details || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-2 text-sm font-semibold">Metadata</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Confidence</dt><dd>{label(item.confidence)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Confidentiality</dt><dd>{label(item.confidentiality)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Date received</dt><dd>{format(item.dateReceived, "d MMM yyyy")}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Source person</dt><dd>{item.sourcePerson ? `${item.sourcePerson.firstName} ${item.sourcePerson.lastName}` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Verified by</dt><dd>{item.verifiedBy ? `${item.verifiedBy.firstName} ${item.verifiedBy.lastName}` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Created by</dt><dd>{item.createdBy.firstName} {item.createdBy.lastName}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {!canConvert && !item.convertedOpportunityId ? (
        <EmptyState
          className="mt-4"
          title="Not eligible for conversion"
          description="Only High or Immediate relevance items can be converted to an opportunity."
        />
      ) : null}
    </div>
  );
}
