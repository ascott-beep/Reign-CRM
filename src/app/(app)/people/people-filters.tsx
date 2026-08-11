"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";

const SENIORITY_VALUES = [
  "BOARD_OR_C_SUITE",
  "N_MINUS_1",
  "DIRECTOR_OR_VP",
  "HEAD_OF",
  "SENIOR_MANAGER",
  "MANAGER",
  "INDIVIDUAL_CONTRIBUTOR",
  "CONSULTANT_OR_INTERIM",
  "OTHER",
];

export function PeopleFilters({
  practiceAreas,
  currentPracticeAreaId,
  currentSeniority,
}: {
  practiceAreas: { id: string; name: string }[];
  currentPracticeAreaId: string;
  currentSeniority: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={currentPracticeAreaId} onValueChange={(v) => setParam("practiceAreaId", v)}>
        <SelectTrigger className="w-44" aria-label="Filter by practice area">
          <SelectValue placeholder="Practice area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All practice areas</SelectItem>
          {practiceAreas.map((pa) => (
            <SelectItem key={pa.id} value={pa.id}>
              {pa.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={currentSeniority} onValueChange={(v) => setParam("seniority", v)}>
        <SelectTrigger className="w-44" aria-label="Filter by seniority">
          <SelectValue placeholder="Seniority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All seniorities</SelectItem>
          {SENIORITY_VALUES.map((s) => (
            <SelectItem key={s} value={s}>
              {label(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
