"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SavedViewsMenu({ views }: { views: { id: string; name: string }[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <ListFilter className="h-4 w-4" />
          Views
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Saved views</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={pathname} aria-current={!activeView}>
            All records
          </Link>
        </DropdownMenuItem>
        {views.map((v) => (
          <DropdownMenuItem key={v.id} asChild>
            <Link href={`${pathname}?view=${v.id}`} aria-current={activeView === v.id}>
              {v.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
