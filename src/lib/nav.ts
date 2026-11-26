import type { LucideIcon } from "lucide-react";
import { LayoutGrid, SquareCheck, Building2, Users, TrendingUp, Briefcase, Compass, BarChart3, Settings } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Key into the counts map passed to the sidebar (server-computed, real data) — omit for items with no count. */
  countKey?: "tasks" | "mandates" | "opportunities" | "intelligence";
  children?: { label: string; href: string }[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

// SPEC.md section 3: groups, order, icons and labels are copied exactly.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutGrid },
      { label: "Tasks", href: "/tasks", icon: SquareCheck, countKey: "tasks" },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        label: "Organisations",
        href: "/organisations",
        icon: Building2,
        children: [
          { label: "Funds", href: "/organisations?type=PE_FUND" },
          { label: "Portfolio Companies", href: "/organisations?type=PORTFOLIO_COMPANY" },
          { label: "Other Organisations", href: "/organisations?type=OTHER" },
        ],
      },
      {
        label: "People",
        href: "/people",
        icon: Users,
        children: [
          { label: "All People", href: "/people" },
          { label: "Candidates", href: "/people?filter=candidates" },
        ],
      },
      { label: "Opportunities", href: "/opportunities", icon: TrendingUp, countKey: "opportunities" },
      { label: "Mandates", href: "/mandates", icon: Briefcase, countKey: "mandates" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Intelligence", href: "/intelligence", icon: Compass, countKey: "intelligence" },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = { label: "Settings", href: "/settings", icon: Settings };
