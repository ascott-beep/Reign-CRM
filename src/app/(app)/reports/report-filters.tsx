"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/iso";

export function ReportFilters({
  users,
  currentUserId,
  currentCurrency,
}: {
  users: { id: string; firstName: string; lastName: string }[];
  currentUserId: string;
  currentCurrency: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/reports?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={currentUserId} onValueChange={(v) => setParam("user", v)}>
        <SelectTrigger className="w-44" aria-label="Filter by user">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All users</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={currentCurrency} onValueChange={(v) => setParam("currency", v)}>
        <SelectTrigger className="w-32" aria-label="Display currency">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
