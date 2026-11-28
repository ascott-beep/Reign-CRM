"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { PRACTICES, PRACTICE_LABEL, type Practice } from "@/lib/practices";
import { cn } from "@/lib/utils";

/** Round 5 screen 07/13 toolbar: filters a board or list by the record's practice. */
export function PracticeFilter({ value }: { value: Practice | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function choose(practice: Practice | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (practice) params.set("practice", practice);
    else params.delete("practice");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-control border border-[var(--color-line)] bg-[var(--color-card)] px-3.5 text-[13px] text-[var(--color-ink)]"
        >
          {value ? PRACTICE_LABEL[value] : "All practices"}
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted)]" strokeWidth={1.8} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[180px] overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-overlay)]"
        >
          <DropdownMenu.Item
            onSelect={() => choose(undefined)}
            className={cn(
              "cursor-pointer rounded-sm px-2 py-1.5 text-[13px] outline-none",
              !value ? "bg-[var(--color-active)] text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:bg-[var(--color-active)]",
            )}
          >
            All practices
          </DropdownMenu.Item>
          {PRACTICES.map((practice) => (
            <DropdownMenu.Item
              key={practice}
              onSelect={() => choose(practice)}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1.5 text-[13px] outline-none",
                value === practice ? "bg-[var(--color-active)] text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:bg-[var(--color-active)]",
              )}
            >
              {PRACTICE_LABEL[practice]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
