import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { label } from "@/lib/labels";
import { formatShortDate } from "@/lib/datetime";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Signal log" };

/** Round 4 screen 30 (R4Intel) "Signal log" — the full list, any review state, as a plain table. */
export default async function SignalLogPage() {
  const user = await requireUser();

  const items = await prisma.intelligenceItem.findMany({
    where: { workspaceId: user.workspaceId, archivedAt: null },
    orderBy: { dateReceived: "desc" },
    include: { organization: { select: { id: true, name: true } }, sources: { select: { url: true, title: true } }, convertedOpportunity: { select: { id: true, name: true } } },
    take: 200,
  });

  function outcome(item: (typeof items)[number]) {
    if (item.convertedOpportunity) return `Opportunity · ${item.convertedOpportunity.name}`;
    if (item.reviewState === "DISMISSED") return item.dismissReason ? `Dismissed · ${label(item.dismissReason)}` : "Dismissed";
    if (item.reviewState === "ACCEPTED") return "Accepted";
    return "Waiting for review";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Signal log"
        description={`${items.length} signal${items.length === 1 ? "" : "s"} recorded`}
        actions={
          <Button asChild variant="secondary">
            <Link href="/intelligence">Back to Intelligence</Link>
          </Button>
        }
      />

      <section className="overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
        {items.length === 0 ? (
          <EmptyState title="No signals recorded yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Headline</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-[var(--color-muted)]">{formatShortDate(item.dateReceived)}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/intelligence/${item.id}`} className="text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                      {item.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[var(--color-ink2)]">{item.sources[0] ? new URL(item.sources[0].url).hostname : ""}</TableCell>
                  <TableCell>
                    <Link href={`/organisations/${item.organization.id}`} className="text-[var(--color-ink2)] hover:text-[var(--color-accent)]">
                      {item.organization.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[var(--color-ink2)]">{outcome(item)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
