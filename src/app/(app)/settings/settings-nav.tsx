"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const YOU_ITEMS = [
  { href: "/settings/profile", label: "My profile" },
  { href: "/settings/connections", label: "Connections" },
  { href: "/settings/notifications", label: "Notifications" },
];

const TEAM_ITEMS = [
  { href: "/settings/users", label: "Users" },
  { href: "/settings/recently-deleted", label: "Recently deleted" },
];

const WORKSPACE_ITEMS = [
  { href: "/settings/workspace", label: "General" },
  { href: "/settings/currencies", label: "Currencies" },
  { href: "/settings/pipeline-stages", label: "Pipeline stages" },
  { href: "/settings/lists-and-tags", label: "Lists and tags" },
  { href: "/settings/custom-fields", label: "Custom fields" },
  { href: "/settings/imports", label: "Imports" },
  { href: "/settings/audit-log", label: "Audit log" },
];

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "block rounded-[6px] px-2.5 py-1.5 text-[13.5px] transition-colors",
          isActive ? "bg-[var(--color-active)] font-medium text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:text-[var(--color-ink)]",
        )}
      >
        {label}
      </Link>
    </li>
  );
}

function NavGroup({ label, items, pathname }: { label: string; items: { href: string; label: string }[]; pathname: string }) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-muted)]">{label}</div>
      <ul className="flex flex-col gap-px">
        {items.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
      </ul>
    </div>
  );
}

/** Round 4 screen 32-42 — flat grouped settings nav: You (everyone), Team and Workspace (admins only). */
export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="w-[200px] shrink-0">
      <NavGroup label="You" items={YOU_ITEMS} pathname={pathname} />
      {isAdmin ? <NavGroup label="Team" items={TEAM_ITEMS} pathname={pathname} /> : null}
      {isAdmin ? <NavGroup label="Workspace" items={WORKSPACE_ITEMS} pathname={pathname} /> : null}
    </nav>
  );
}
