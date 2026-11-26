import { requireUser } from "@/lib/permissions";
import { EmptyState } from "@/components/shell/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listRecentlyDeleted, deletableTypeLabel, type DeletableType } from "@/lib/delete";
import { format, addDays } from "date-fns";
import { RestoreButton } from "./restore-button";
import { EraseButton } from "./erase-button";

const TYPE_FILTERS: { value: DeletableType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ORGANIZATION", label: "Organisations" },
  { value: "PERSON", label: "People" },
  { value: "MANDATE", label: "Mandates" },
  { value: "OPPORTUNITY", label: "Opportunities" },
];

/** Section 9.3 / screen 14 — everything soft-deleted, purged automatically 30 days after archiving. */
export default async function SettingsRecentlyDeletedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await requireUser();
  const { type } = await searchParams;
  const rows = await listRecentlyDeleted(user.workspaceId);
  const filtered = type && type !== "ALL" ? rows.filter((r) => r.type === type) : rows;

  return (
    <div>
      <div className="mb-3 flex gap-1 border-b border-[var(--color-line)]">
        {TYPE_FILTERS.map((f) => (
          <a
            key={f.value}
            href={f.value === "ALL" ? "/settings/recently-deleted" : `/settings/recently-deleted?type=${f.value}`}
            className={`border-b-2 px-3 py-2 text-[13.5px] ${
              (type ?? "ALL") === f.value ? "border-[var(--color-ink)] font-medium text-[var(--color-ink)]" : "border-transparent text-[var(--color-ink2)]"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here" description="Deleted records show up here for 30 days before they're removed for good." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Removed for good</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={`${row.type}-${row.id}`}>
                <TableCell>{row.label}</TableCell>
                <TableCell className="text-[var(--color-ink-subtle)]">{deletableTypeLabel(row.type)}</TableCell>
                <TableCell>{format(row.archivedAt, "d MMM yyyy")}</TableCell>
                <TableCell>{row.archivedByName ?? "—"}</TableCell>
                <TableCell>{row.archiveReason ?? "—"}</TableCell>
                <TableCell className="text-[var(--color-ink-subtle)]">{format(addDays(row.archivedAt, 30), "d MMM yyyy")}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <RestoreButton type={row.type} id={row.id} />
                    {row.type === "PERSON" ? <EraseButton personId={row.id} label={row.label} /> : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
