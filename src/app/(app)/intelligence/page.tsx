import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { intelligenceViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { SavedViewsMenu } from "@/components/shell/saved-views-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const viewId = typeof sp.view === "string" ? sp.view : undefined;

  const [views, activeView] = await Promise.all([
    prisma.savedView.findMany({ where: { workspaceId: user.workspaceId, entityType: "INTELLIGENCE" }, orderBy: { name: "asc" } }),
    viewId ? prisma.savedView.findUnique({ where: { id: viewId } }) : Promise.resolve(null),
  ]);

  const where: Prisma.IntelligenceItemWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (activeView) Object.assign(where, intelligenceViewWhere(activeView.filterJson as Record<string, unknown>));

  const items = await prisma.intelligenceItem.findMany({
    where,
    orderBy: { dateReceived: "desc" },
    include: { organization: true, owner: true },
  });

  return (
    <div>
      <PageHeader
        title="Intelligence"
        description={`${items.length} item${items.length === 1 ? "" : "s"}`}
        actions={
          <>
            <SavedViewsMenu views={views} />
            <Button asChild>
              <Link href="/intelligence/new">
                <Plus className="h-4 w-4" /> New intelligence item
              </Link>
            </Button>
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState title="No intelligence recorded yet" />
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Relevance</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Owner</TableHead>
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
                  <TableCell>{i.organization.name}</TableCell>
                  <TableCell>{label(i.type)}</TableCell>
                  <TableCell>{label(i.confidence)}</TableCell>
                  <TableCell>
                    <Badge tone={i.commercialRelevance === "IMMEDIATE" || i.commercialRelevance === "HIGH" ? "warning" : "neutral"}>{label(i.commercialRelevance)}</Badge>
                  </TableCell>
                  <TableCell>{format(i.dateReceived, "d MMM yyyy")}</TableCell>
                  <TableCell>{i.owner.firstName} {i.owner.lastName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
