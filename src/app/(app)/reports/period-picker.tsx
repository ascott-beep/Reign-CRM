"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "this-year", label: "This year" },
  { value: "last-12-months", label: "Last 12 months" },
  { value: "all-time", label: "All time" },
];

export function PeriodPicker({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Select
      value={current}
      onValueChange={(v) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("period", v);
        router.push(`/reports?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
