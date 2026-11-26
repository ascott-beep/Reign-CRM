import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toggleLookupItemAction, updatePracticeAreaColorAction } from "../actions";
import { CreateLookupItemDialog, CreateTagDialog } from "../settings-dialogs";

export default async function SettingsListsAndTagsPage() {
  const user = await requireUser();
  const [sectors, practiceAreas, specialisms, investorStrategies, ownershipTypes, tags] = await Promise.all([
    prisma.sector.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.practiceArea.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.functionalSpecialism.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.investorStrategy.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.ownershipType.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.tag.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { name: "asc" } }),
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
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Tags</h3>
            <CreateTagDialog />
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t.id} tone="neutral">
                {t.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
