"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Plus } from "lucide-react";
import { createTaskAction } from "./actions";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Reads a trailing date phrase off the end of plain English text; everything before it becomes the task title. */
function parseDueDate(text: string): { title: string; dueDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lower = text.toLowerCase();

  const patterns: { regex: RegExp; resolve: (match: RegExpMatchArray) => Date }[] = [
    { regex: /\btoday\b\.?$/, resolve: () => today },
    { regex: /\btomorrow\b\.?$/, resolve: () => new Date(today.getTime() + 24 * 60 * 60 * 1000) },
    {
      regex: /\bin (\d+) days?\b\.?$/,
      resolve: (m) => new Date(today.getTime() + Number(m[1]) * 24 * 60 * 60 * 1000),
    },
    {
      regex: new RegExp(`\\bnext (${WEEKDAYS.join("|")})\\b\\.?$`),
      resolve: (m) => {
        const target = WEEKDAYS.indexOf(m[1]!);
        const diff = ((target - today.getDay() + 7) % 7) + 7;
        return new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
      },
    },
    {
      regex: new RegExp(`\\b(${WEEKDAYS.join("|")})\\b\\.?$`),
      resolve: (m) => {
        const target = WEEKDAYS.indexOf(m[1]!);
        const diff = ((target - today.getDay() + 7) % 7) || 7;
        return new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
      },
    },
  ];

  for (const p of patterns) {
    const match = lower.match(p.regex);
    if (match) {
      return { title: text.slice(0, match.index).trim().replace(/[,.]$/, ""), dueDate: p.resolve(match) };
    }
  }
  return { title: text.trim(), dueDate: today };
}

export function QuickAddTask({ currentUserId }: { currentUserId: string }) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    const { title, dueDate } = parseDueDate(trimmed);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("dueDate", dueDate.toISOString());
    fd.set("assignedUserId", currentUserId);
    fd.set("type", "OTHER");
    fd.set("priority", "NORMAL");
    fd.set("status", "TODO");
    startTransition(async () => {
      try {
        await createTaskAction({}, fd);
      } catch {
        // createTaskAction redirects on success (throws NEXT_REDIRECT) — nothing else to catch here.
      }
      setValue("");
      router.refresh();
    });
  }

  return (
    <div className="flex h-11 items-center gap-2.5 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-3.5">
      <Plus className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        disabled={pending}
        placeholder='Add a task, e.g. "Call Rebecca Nash about the Vantage offer tomorrow"'
        className="flex-1 border-0 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
      />
      <CornerDownLeft className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
    </div>
  );
}
