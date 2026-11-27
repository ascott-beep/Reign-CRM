"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EVERYONE_ITEMS = [
  { href: "/settings/profile", label: "My profile" },
  { href: "/settings/connections", label: "Connections" },
];

/** Round 2 section 9 "Settings order: Users, Connections, Currencies and Recently deleted at the top." (Connections is already in EVERYONE_ITEMS above.) */
const ADMIN_TOP_ITEMS = [
  { href: "/settings/users", label: "Users" },
  { href: "/settings/currencies", label: "Currencies" },
  { href: "/settings/recently-deleted", label: "Recently deleted" },
];

/** "Everything else... goes under 'Advanced'." */
const ADMIN_ADVANCED_ITEMS = [
  { href: "/settings/workspace", label: "Workspace" },
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

/** Section 9.4 — the Settings sub-nav, screen 12. Profile and Connections are for every user; the rest are administrator-only, grouped per Round 2 section 9 with the less-common pages collapsed under "Advanced" by default. */
export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const advancedActive = ADMIN_ADVANCED_ITEMS.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  const [advancedOpen, setAdvancedOpen] = useState(advancedActive);

  return (
    <nav className="w-[200px] shrink-0">
      <ul className="flex flex-col gap-px">
        {EVERYONE_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
        {isAdmin ? ADMIN_TOP_ITEMS.map((item) => <NavLink key={item.href} {...item} pathname={pathname} />) : null}
      </ul>

      {isAdmin ? (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-[13.5px] text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-90")} />
            Advanced
          </button>
          {advancedOpen ? (
            <ul className="flex flex-col gap-px pl-1">
              {ADMIN_ADVANCED_ITEMS.map((item) => (
                <NavLink key={item.href} {...item} pathname={pathname} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
