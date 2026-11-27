"use client";

import { useState, useTransition } from "react";
import { Users, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { setDeskAction } from "@/lib/desk-actions";
import { cn } from "@/lib/utils";

export type DeskOption = { id: string; label: string };

/**
 * UI-only for now: it remembers the choice (cookie) but doesn't yet filter
 * any page's data — SPEC.md section 3 describes it as filtering "every
 * panel on the page", which means touching each page's queries. That's
 * page-content work for a later phase; Phase 1 is the shell this will
 * plug into.
 */
export function DeskPicker({ options, initialValue }: { options: DeskOption[]; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [, startTransition] = useTransition();

  const current = value === "" ? "All desks" : value === "me" ? "My desk" : (options.find((o) => o.id === value)?.label ?? "All desks");

  function choose(id: string) {
    setValue(id);
    startTransition(() => {
      setDeskAction(id);
    });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-control border border-[var(--color-line)] bg-[var(--color-card)] px-3.5 text-[13px] text-[var(--color-ink)]"
        >
          <Users className="h-[15px] w-[15px] text-[var(--color-muted)]" strokeWidth={1.7} />
          {current}
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
            onSelect={() => choose("")}
            className={cn(
              "cursor-pointer rounded-sm px-2 py-1.5 text-[13px] outline-none",
              value === "" ? "bg-[var(--color-active)] text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:bg-[var(--color-active)]",
            )}
          >
            All desks
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => choose("me")}
            className={cn(
              "cursor-pointer rounded-sm px-2 py-1.5 text-[13px] outline-none",
              value === "me" ? "bg-[var(--color-active)] text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:bg-[var(--color-active)]",
            )}
          >
            My desk
          </DropdownMenu.Item>
          <div className="my-1 h-px bg-[var(--color-line)]" />
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.id}
              onSelect={() => choose(option.id)}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1.5 text-[13px] outline-none",
                value === option.id ? "bg-[var(--color-active)] text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:bg-[var(--color-active)]",
              )}
            >
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
