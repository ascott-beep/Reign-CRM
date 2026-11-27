import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PermissionDeniedState, EmptyState } from "@/components/shell/states";
import { Card, CardContent } from "@/components/ui/card";
import { toggleLookupItemAction, updatePracticeAreaColorAction, listTagsWithCounts } from "../actions";
import { CreateLookupItemDialog, CreateTagDialog } from "../settings-dialogs";
import { TagRow } from "../tag-row";

const SAVED_LIST_ENTITY_HREF: Record<string, string> = { PERSON: "/people", ORGANIZATION: "/organisations" };
const SAVED_LIST_ENTITY_NOUN: Record<string, string> = { PERSON: "people", ORGANIZATION: "organisations" };

export default async function SettingsListsAndTagsPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const [sectors, practiceAreas, specialisms, investorStrategies, ownershipTypes, tags, savedLists] = await Promise.all([
    prisma.sector.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.practiceArea.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.functionalSpecialism.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.investorStrategy.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.ownershipType.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    listTagsWithCounts(user.workspaceId),
    prisma.savedView.findMany({
      where: { workspaceId: user.workspaceId, entityType: { in: ["PERSON", "ORGANIZATION"] } },
      include: { owner: { select: { firstName: true, lastName: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Practice Area</h3>
              <CreateLookupItemDialog kind="practiceArea" label="Practice Area" />
            </div>
            <p className="mb-2 text-xs text-[var(--color-ink-subtle)]">Colours are used for practice-area tags across People and Mandates.</p>
            <ul className="flex flex-col gap-2">
              {practiceAreas.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className={item.active ? "" : "text-[var(--color-ink-subtle)] line-through"}>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <form action={updatePracticeAreaColorAction.bind(null, item.id)} className="flex items-center gap-1.5">
                      <input
                        type="color"
                        name="colorHex"
                        defaultValue={item.colorHex ?? "#8a8a94"}
                        className="h-7 w-7 cursor-pointer rounded border border-[var(--color-border-strong)] bg-transparent p-0.5"
                      />
                      <button type="submit" className="text-xs text-[var(--color-accent)]">
                        Save
                      </button>
                    </form>
                    <form action={toggleLookupItemAction.bind(null, "practiceArea", item.id, !item.active)}>
                      <button type="submit" className="text-xs text-[var(--color-accent)]">
                        {item.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        {[
          { kind: "sector" as const, label: "Sector", items: sectors },
          { kind: "functionalSpecialism" as const, label: "Functional Specialism", items: specialisms },
          { kind: "investorStrategy" as const, label: "Investor Strategy", items: investorStrategies },
          { kind: "ownershipType" as const, label: "Ownership", items: ownershipTypes },
        ].map((group) => (
          <Card key={group.kind}>
            <CardContent className="pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{group.label}</h3>
                <CreateLookupItemDialog kind={group.kind} label={group.label} />
              </div>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className={item.active ? "" : "text-[var(--color-ink-subtle)] line-through"}>{item.name}</span>
                    <form action={toggleLookupItemAction.bind(null, group.kind, item.id, !item.active)}>
                      <button type="submit" className="text-xs text-[var(--color-accent)]">
                        {item.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold">Tags</h3>
              <p className="text-xs text-[var(--color-ink-subtle)]">Used on people, organisations, opportunities and mandates.</p>
            </div>
            <CreateTagDialog />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-subtle)]">No tags yet.</p>
            ) : (
              tags.map((t) => <TagRow key={t.id} tag={t} otherTags={tags.filter((other) => other.id !== t.id)} />)
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-sm font-semibold">Saved lists</h3>
          {savedLists.length === 0 ? (
            <EmptyState
              title="No saved lists yet"
              description="Saved lists are made from a filtered People or Organisations view with Save as list."
            />
          ) : (
            <div className="mt-2 flex flex-col">
              {savedLists.map((list, i) => (
                <div key={list.id} className={i > 0 ? "flex items-center justify-between border-t border-[var(--color-line)] py-3" : "flex items-center justify-between pb-3"}>
                  <div>
                    <p className="text-sm text-[var(--color-ink)]">{list.name}</p>
                    <p className="text-xs text-[var(--color-ink-subtle)]">
                      {SAVED_LIST_ENTITY_NOUN[list.entityType] ?? list.entityType.toLowerCase()} ·{" "}
                      {list.shared ? "Shared" : list.owner ? `${list.owner.firstName} ${list.owner.lastName}` : "Shared"}
                    </p>
                  </div>
                  <Link href={`${SAVED_LIST_ENTITY_HREF[list.entityType] ?? "/"}?view=${list.id}`} className="text-sm text-[var(--color-accent)]">
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
