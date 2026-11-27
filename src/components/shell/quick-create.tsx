"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, SquareCheck, PencilLine, User, Building2, TrendingUp, Briefcase, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** d08 "Quick create" — order, icons and single-letter shortcuts match the reference exactly. */
const QUICK_CREATE_LINKS = [
  { label: "Task", href: "/tasks/new", icon: SquareCheck, key: "t" },
  { label: "Log activity", href: "/activities/new", icon: PencilLine, key: "a" },
  { label: "Person", href: "/people/new", icon: User, key: "p" },
  { label: "Organisation", href: "/organisations/new", icon: Building2, key: "o" },
  { label: "Opportunity", href: "/opportunities/new", icon: TrendingUp, key: "n" },
  { label: "Mandate", href: "/mandates/new", icon: Briefcase, key: "m" },
];

export function QuickCreate({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const match = QUICK_CREATE_LINKS.find((l) => l.key === e.key.toLowerCase());
      if (match) {
        e.preventDefault();
        setOpen(false);
        router.push(match.href);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, router]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Button size="icon" aria-label="New" title="New">
            <Plus className="h-[14px] w-[14px]" />
          </Button>
        ) : (
          <Button className="flex-1 justify-start">
            <Plus className="h-[14px] w-[14px]" />
            New
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        {QUICK_CREATE_LINKS.map((link) => (
          <DropdownMenuItem key={link.href} asChild className="h-[38px] px-2.5">
            <Link href={link.href} className="flex items-center gap-2.5">
              <link.icon className="h-[15px] w-[15px] text-[var(--color-ink2)]" />
              <span className="flex-1">{link.label}</span>
              <span className="rounded-[4px] border border-[var(--color-line)] px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]">{link.key.toUpperCase()}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="h-[38px] px-2.5">
          <Link href="/settings/imports" className="flex items-center gap-2.5">
            <Upload className="h-[15px] w-[15px] text-[var(--color-ink2)]" />
            <span className="flex-1">Import from a spreadsheet</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
