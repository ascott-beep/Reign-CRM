"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border)] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-accent-ink)]">
          RP
        </div>
        <span className="text-sm font-semibold text-[var(--color-ink)]">Reign Partners</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--color-canvas)] text-[var(--color-ink)]"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]",
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                  {item.label}
                </Link>
                {item.children && isActive ? (
                  <ul className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-border)] pl-3">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className={cn(
                            "block rounded-md px-2 py-1 text-xs font-medium transition-colors",
                            currentHref === child.href
                              ? "text-[var(--color-accent)]"
                              : "text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]",
                          )}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
