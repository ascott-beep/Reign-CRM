"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const EVERYONE_ITEMS = [
  { href: "/settings/profile", label: "My profile" },
  { href: "/settings/connections", label: "Connections" },
];

const ADMIN_ITEMS = [
  { href: "/settings/users", label: "Users" },
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/currencies", label: "Currencies" },
  { href: "/settings/pipeline-stages", label: "Pipeline stages" },
  { href: "/settings/lists-and-tags", label: "Lists and tags" },
  { href: "/settings/custom-fields", label: "Custom fields" },
  { href: "/settings/imports", label: "Imports" },
  { href: "/settings/recently-deleted", label: "Recently deleted" },
  { href: "/settings/audit-log", label: "Audit log" },
];

/** Section 9.4 — the Settings sub-nav, screen 12. Profile and Connections are for every user; the rest are administrator-only. */
export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...EVERYONE_ITEMS, ...ADMIN_ITEMS] : EVERYONE_ITEMS;

  return (
    <nav className="w-[200px] shrink-0">
      <ul className="flex flex-col gap-px">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block rounded-[6px] px-2.5 py-1.5 text-[13.5px] transition-colors",
                  isActive ? "bg-[var(--color-active)] font-medium text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:text-[var(--color-ink)]",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
