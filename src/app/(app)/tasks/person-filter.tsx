"use client";

import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type PersonOption = { id: string; firstName: string; lastName: string };

/**
 * Round 5 screen 12 — who the "To do"/"Upcoming"/"Done" lists are scoped to.
 * Distinct from the shared cookie-backed DeskPicker used elsewhere: this one
 * is URL-driven so it composes with the Mine/Team toggle without the two
 * fighting over the same stored value.
 */
export function PersonFilter({
  options,
  currentUser,
  selectedId,
  mine,
  query,
}: {
  options: PersonOption[];
  currentUser: PersonOption;
  selectedId: string | null;
  mine: boolean;
  query: Record<string, string>;
}) {
  const router = useRouter();

  const selected = mine ? currentUser : (options.find((o) => o.id === selectedId) ?? null);
  const label = selected ? `${selected.firstName} ${selected.lastName}` : "Everyone";
  const avatarName = selected ?? { firstName: "E", lastName: "" };

  function go(personId: string | null) {
    const params = new URLSearchParams(query);
    params.set("view", "team");
    if (personId) params.set("person", personId);
    else params.delete("person");
    router.push(`/tasks?${params.toString()}`);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-control border border-[var(--color-line)] bg-[var(--color-card)] px-2.5 text-[13px] text-[var(--color-ink)]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-navy)] text-[10px] font-semibold text-[var(--color-navy-ink)]">
            {selected ? initials(avatarName.firstName, avatarName.lastName) : "?"}
          </span>
          {label}
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
            onSelect={() => go(null)}
            className={cn(
              "cursor-pointer rounded-sm px-2 py-1.5 text-[13px] outline-none",
              !mine && !selectedId ? "bg-[var(--color-active)] text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:bg-[var(--color-active)]",
            )}
          >
            Everyone
          </DropdownMenu.Item>
          <div className="my-1 h-px bg-[var(--color-line)]" />
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.id}
              onSelect={() => go(option.id)}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1.5 text-[13px] outline-none",
                !mine && selectedId === option.id ? "bg-[var(--color-active)] text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:bg-[var(--color-active)]",
              )}
            >
              {option.firstName} {option.lastName}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
