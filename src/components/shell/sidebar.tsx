"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Settings as SettingsIcon } from "lucide-react";
import { NAV_GROUPS, SETTINGS_NAV_ITEM, type NavItem } from "@/lib/nav";
import { ReignMark } from "@/components/shell/reign-logo";
import { AtlasLogo } from "@/components/brand/atlas-logo";
import { UserMenu } from "@/components/shell/user-menu";
import { setSidebarCollapsedAction } from "@/lib/sidebar-actions";
import { initials, cn } from "@/lib/utils";
import { label } from "@/lib/labels";

export type NavCounts = Partial<Record<"tasks" | "mandates" | "opportunities" | "intelligence", number>>;

function NavLink({
  item,
  isActive,
  currentHref,
  collapsed,
  count,
}: {
  item: NavItem;
  isActive: boolean;
  currentHref: string;
  collapsed: boolean;
  count?: number;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        title={item.label}
        aria-label={item.label}
        className={cn(
          "relative flex h-[34px] items-center gap-[11px] rounded-[8px] px-2.5 text-[13.5px] transition-colors",
          collapsed && "justify-center px-0",
          isActive ? "bg-[var(--color-active)] font-medium text-[var(--color-ink)]" : "text-[var(--color-ink2)] hover:text-[var(--color-ink)]",
        )}
      >
        {isActive ? <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-full bg-[var(--color-ink)]" /> : null}
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
        {!collapsed ? (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <span className="text-xs text-[var(--color-muted)]">{count ? count : ""}</span>
          </>
        ) : null}
      </Link>
      {item.children && isActive && !collapsed ? (
        <ul className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-line)] pl-3">
          {item.children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className={cn(
                  "block rounded-md px-2 py-1 text-xs transition-colors",
                  currentHref === child.href ? "text-[var(--color-ink)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
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
}

export function Sidebar({
  user,
  counts,
  defaultCollapsed,
}: {
  user: { firstName: string; lastName: string; role: string };
  counts: NavCounts;
  defaultCollapsed: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [, startTransition] = useTransition();

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(() => {
      setSidebarCollapsedAction(next);
    });
  }

  function isItemActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col gap-[18px] overflow-y-auto border-r border-[var(--color-line)] bg-[var(--color-side)] pb-[14px] pt-[18px] md:flex",
        collapsed ? "w-[68px] px-2" : "w-[228px] px-3",
      )}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-2">
          <ReignMark className="h-6 w-6 text-[var(--color-ink)]" />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-active)]"
          >
            <PanelLeftOpen className="h-[17px] w-[17px]" strokeWidth={1.6} />
          </button>
        </div>
      ) : (
        <div className="flex min-h-[30px] items-center justify-between pl-2.5">
          <Link href="/dashboard" aria-label="Atlas home" className="flex items-center text-[var(--color-ink)]">
            <AtlasLogo className="h-[26px] w-auto" />
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-active)]"
          >
            <PanelLeftClose className="h-[17px] w-[17px]" strokeWidth={1.6} />
          </button>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-[18px]">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-px">
            {collapsed ? (
              <div className="mx-2 h-px bg-[var(--color-line)]" />
            ) : (
              <div className="px-2.5 pb-2 text-[11px] tracking-[0.16em] text-[var(--color-muted)]">{group.label.toUpperCase()}</div>
            )}
            <ul className="flex flex-col gap-px">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isItemActive(item.href)}
                  currentHref={currentHref}
                  collapsed={collapsed}
                  count={item.countKey ? counts[item.countKey] : undefined}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-2.5">
        <div className="h-px bg-[var(--color-line)]" />
        <div className={cn("flex items-center gap-2.5", collapsed ? "justify-center" : "px-1")}>
          <UserMenu
            firstName={user.firstName}
            lastName={user.lastName}
            role={user.role}
            align="start"
            trigger={
              <button
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left hover:bg-[var(--color-active)]",
                  collapsed ? "justify-center p-1" : "p-1",
                )}
              >
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-[11px] font-semibold text-[var(--color-navy-ink)]">
                  {initials(user.firstName, user.lastName)}
                </span>
                {!collapsed ? (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-[var(--color-ink)]">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="block truncate text-[11.5px] text-[var(--color-muted)]">{label(user.role)}</span>
                  </span>
                ) : null}
              </button>
            }
          />
          {!collapsed ? (
            <Link
              href={SETTINGS_NAV_ITEM.href}
              title="Settings"
              aria-label="Settings"
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md text-[var(--color-ink2)] hover:bg-[var(--color-active)]"
            >
              <SettingsIcon className="h-[17px] w-[17px]" strokeWidth={1.6} />
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
