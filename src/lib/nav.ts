import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Target,
  Briefcase,
  CheckSquare,
  Radar,
  BarChart3,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  children?: { label: string; href: string }[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
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
  { label: "Opportunities", href: "/opportunities", icon: Target },
  { label: "Mandates", href: "/mandates", icon: Briefcase },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Intelligence", href: "/intelligence", icon: Radar },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
