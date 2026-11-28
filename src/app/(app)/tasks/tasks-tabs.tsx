import Link from "next/link";

const TABS = [
  { key: "todo", label: "To do" },
  { key: "upcoming", label: "Upcoming" },
  { key: "done", label: "Done" },
] as const;

export function TasksTabs({ active, query }: { active: string; query: Record<string, string> }) {
  const qs = (tab: string) => new URLSearchParams({ ...query, tab }).toString();
  return (
    <div role="tablist" aria-label="Tasks" className="flex gap-5 border-b border-[var(--color-line)]">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/tasks?${qs(t.key)}`}
          role="tab"
          aria-selected={active === t.key}
          className={`-mb-px border-b-2 px-0.5 pb-2.5 text-[13.5px] no-underline ${
            active === t.key ? "border-[var(--color-navy)] text-[var(--color-ink)]" : "border-transparent text-[var(--color-ink2)]"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
