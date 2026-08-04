"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const QUICK_CREATE_LINKS = [
  { label: "Organisation", href: "/organisations/new" },
  { label: "Person", href: "/people/new" },
  { label: "Opportunity", href: "/opportunities/new" },
  { label: "Mandate", href: "/mandates/new" },
  { label: "Task", href: "/tasks/new" },
  { label: "Activity", href: "/activities/new" },
  { label: "Intelligence item", href: "/intelligence/new" },
];

export function QuickCreate() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Quick create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {QUICK_CREATE_LINKS.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link href={link.href}>{link.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
