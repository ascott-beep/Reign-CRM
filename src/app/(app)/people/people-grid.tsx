import Link from "next/link";
import { MapPin, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { PracticeAreaBadge } from "@/components/ui/practice-area-badge";
import { label } from "@/lib/labels";
import { initials } from "@/lib/utils";

export type GridPerson = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  organisationName: string | null;
  city: string | null;
  ownerName: string | null;
  statusValue: string | null;
  candidateRating: string | null;
  compensation: string | null;
  practiceAreas: { id: string; name: string; colorHex: string | null }[];
};

export function PeopleGrid({ people }: { people: GridPerson[] }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      {people.map((p) => (
        <Link key={p.id} href={`/people/${p.id}`} className="block">
          <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{initials(p.firstName, p.lastName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                    {p.firstName} {p.lastName}
                  </p>
                  {p.title ? <p className="truncate text-xs text-[var(--color-ink-subtle)]">{p.title}</p> : null}
                </div>
              </div>

              <dl className="flex flex-1 flex-col gap-1.5 text-xs text-[var(--color-ink-subtle)]">
                {p.organisationName ? (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.organisationName}</span>
                  </div>
                ) : null}
                {p.city ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.city}</span>
                  </div>
                ) : null}
                {p.compensation ? <div>Expects {p.compensation}</div> : null}
              </dl>

              <div className="flex flex-wrap items-center gap-1.5">
                {p.statusValue ? <StatusBadge value={p.statusValue} /> : null}
                {p.candidateRating ? <Badge tone="info">{label(p.candidateRating)}</Badge> : null}
              </div>

              {p.practiceAreas.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {p.practiceAreas.map((pa) => (
                    <PracticeAreaBadge key={pa.id} name={pa.name} colorHex={pa.colorHex} />
                  ))}
                </div>
              ) : null}

              <div className="mt-auto border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-ink-subtle)]">
                {p.ownerName ?? "Unowned"}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
