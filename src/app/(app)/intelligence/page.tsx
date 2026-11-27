import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { subDays } from "date-fns";
import { formatShortDate } from "@/lib/datetime";
import { ReviewQueue } from "./review-queue";
import { TypeFilter } from "./type-filter";
import type { Prisma, IntelligenceType } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Intelligence" };

const ALL_TYPES: IntelligenceType[] = [
  "LEADERSHIP_CHANGE",
  "POTENTIAL_VACANCY",
  "ACTIVE_VACANCY",
  "ACQUISITION",
  "INTEGRATION",
  "CARVE_OUT",
  "TRANSFORMATION",
  "INTERNATIONAL_EXPANSION",
  "EXIT_PREPARATION",
  "REFINANCING",
];

export default async function IntelligencePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const typeFilter = typeof sp.type === "string" && ALL_TYPES.includes(sp.type as IntelligenceType) ? (sp.type as IntelligenceType) : undefined;

  const where: Prisma.IntelligenceItemWhereInput = { workspaceId: user.workspaceId, archivedAt: null, reviewState: "ACCEPTED" };
  if (typeFilter) where.type = typeFilter;

  const queueSelect = {
    id: true,
    title: true,
    type: true,
    confidence: true,
    dateReceived: true,
    dismissReason: true,
    dismissedAt: true,
    organization: { select: { id: true, name: true } },
    sources: { select: { id: true, url: true, title: true } },
  } satisfies Prisma.IntelligenceItemSelect;

  const [items, pendingReview, dismissedRecently] = await Promise.all([
    prisma.intelligenceItem.findMany({
      where,
      orderBy: { dateReceived: "desc" },
      include: { organization: true, owner: true, convertedOpportunity: { select: { name: true, potentialRoleTitle: true } } },
    }),
    prisma.intelligenceItem.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, reviewState: "PENDING_REVIEW" },
      orderBy: { dateReceived: "desc" },
      select: queueSelect,
    }),
    prisma.intelligenceItem.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, reviewState: "DISMISSED", dismissedAt: { gte: subDays(new Date(), 30) } },
      orderBy: { dismissedAt: "desc" },
      select: queueSelect,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Intelligence"
        description={`Market signals across your organisations · ${items.length} logged · ${pendingReview.length} waiting for review`}
        actions={
          <>
            <TypeFilter types={ALL_TYPES} current={typeFilter ?? "ALL"} />
            <Button asChild>
              <Link href="/intelligence/new">
                <Plus className="h-[14px] w-[14px]" /> Log signal
              </Link>
            </Button>
          </>
        }
      />

      <ReviewQueue pending={pendingReview} dismissed={dismissedRecently} />

      <section className="overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
        {items.length === 0 ? (
          <EmptyState title="No intelligence recorded yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Signal</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Relevance</TableHead>
                <TableHead>Linked work</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    <Link href={`/intelligence/${i.id}`} className="text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                      {i.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/organisations/${i.organizationId}`} className="text-[var(--color-ink2)]">
                      {i.organization.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge tone="neutral">{label(i.type)}</Badge>
                  </TableCell>
                  <TableCell>{label(i.confidence)}</TableCell>
                  <TableCell>
                    <Badge tone={i.commercialRelevance === "IMMEDIATE" || i.commercialRelevance === "HIGH" ? "warning" : "neutral"}>{label(i.commercialRelevance)}</Badge>
                  </TableCell>
                  <TableCell>{i.convertedOpportunity ? `Opportunity · ${i.convertedOpportunity.potentialRoleTitle ?? i.convertedOpportunity.name}` : "—"}</TableCell>
                  <TableCell className="text-[var(--color-muted)]">{formatShortDate(i.dateReceived)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
