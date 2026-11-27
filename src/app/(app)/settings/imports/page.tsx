import Link from "next/link";
import { Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { label } from "@/lib/labels";
import { formatShortDate } from "@/lib/datetime";

type RowResult = { status: "created" | "updated" | "error" };

function summaryLine(rowReport: unknown, totalRows: number, successRows: number, errorRows: number): string {
  if (Array.isArray(rowReport)) {
    const rows = rowReport as RowResult[];
    const added = rows.filter((r) => r.status === "created").length;
    const matched = rows.filter((r) => r.status === "updated").length;
    const errors = rows.filter((r) => r.status === "error").length;
    const parts = [`${added} added`];
    if (matched > 0) parts.push(`${matched} matched to existing`);
    if (errors > 0) parts.push(`${errors} skipped`);
    return parts.join(", ");
  }
  return `${successRows} of ${totalRows} rows imported${errorRows > 0 ? `, ${errorRows} skipped` : ""}`;
}

export default async function SettingsImportsPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const importJobs = await prisma.importJob.findMany({
    where: { workspaceId: user.workspaceId },
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium text-[var(--color-ink)]">Imports</h2>
        <p className="text-sm text-[var(--color-ink-subtle)]">Bring records in from a spreadsheet.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Upload className="h-6 w-6 text-[var(--color-muted)]" />
          <div>
            <p className="font-medium text-[var(--color-ink)]">Drop a CSV file</p>
            <p className="mt-1 text-sm text-[var(--color-ink-subtle)]">People or organisations. We&apos;ll check for duplicates before anything is added.</p>
          </div>
          <div className="mt-1 flex gap-2">
            <Button asChild>
              <Link href="/import/people">Choose a people file</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/import/organisations">Choose an organisations file</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-2 text-sm font-semibold">Past imports</h3>
          {importJobs.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-subtle)]">No imports yet.</p>
          ) : (
            <div className="flex flex-col">
              {importJobs.map((j, i) => (
                <div key={j.id} className={i > 0 ? "flex items-center justify-between border-t border-[var(--color-line)] py-3" : "flex items-center justify-between pb-3"}>
                  <div>
                    <p className="text-sm text-[var(--color-ink)]">{j.originalFilename}</p>
                    <p className="text-xs text-[var(--color-ink-subtle)]">
                      {summaryLine(j.rowReport, j.totalRows, j.successRows, j.errorRows)} · {formatShortDate(j.createdAt)} · {label(j.entityType)}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-ink-subtle)]">{j.createdBy.firstName} {j.createdBy.lastName}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-[var(--color-ink-subtle)]">
            Undoing an import isn&apos;t available yet, it would need a way to track and reverse each row an import created.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
