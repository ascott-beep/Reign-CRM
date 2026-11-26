"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";

export function TypeFilter({ types, current }: { types: string[]; current: string }) {
  const router = useRouter();
  return (
    <Select value={current} onValueChange={(v) => router.push(v === "ALL" ? "/intelligence" : `/intelligence?type=${v}`)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All types</SelectItem>
        {types.map((t) => (
          <SelectItem key={t} value={t}>
            {label(t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
