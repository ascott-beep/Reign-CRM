import Link from "next/link";
import { Building2, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/labels";
import { formatMonthYear } from "@/lib/datetime";

export function RelatedOrgCard({
  id,
  name,
  type,
  subtitle,
  investmentStatus,
  date,
}: {
  id: string;
  name: string;
  type: string;
  subtitle?: string | null;
  investmentStatus?: string | null;
  date?: Date | null;
}) {
  return (
    <Link href={`/organisations/${id}`} className="block">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
        <CardContent className="flex items-start gap-2.5 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-highlight-subtle)] text-[var(--color-highlight)]">
            {type === "PE_FUND" ? <Landmark className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-ink)]">{name}</p>
            <p className="truncate text-xs text-[var(--color-ink-subtle)]">{subtitle ?? label(type)}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {investmentStatus ? <Badge tone={investmentStatus === "CURRENT" ? "success" : "neutral"}>{label(investmentStatus)}</Badge> : null}
              {date ? <span className="text-xs text-[var(--color-ink-subtle)]">{formatMonthYear(date)}</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
