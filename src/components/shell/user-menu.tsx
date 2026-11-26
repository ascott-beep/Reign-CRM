"use client";

import { LogOut, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { initials } from "@/lib/utils";
import { label } from "@/lib/labels";
import { signOutAction } from "@/app/(app)/actions";

export function UserMenu({
  firstName,
  lastName,
  role,
  trigger,
  align = "end",
}: {
  firstName: string;
  lastName: string;
  role: string;
  /** Custom trigger element (e.g. the sidebar's avatar + name row). Defaults to a small avatar button, used in the header. */
  trigger?: React.ReactNode;
  align?: "start" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[var(--color-canvas)]">
            <Avatar>
              <AvatarFallback>{initials(firstName, lastName)}</AvatarFallback>
            </Avatar>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[var(--color-ink)]">
              {firstName} {lastName}
            </span>
            <span className="text-xs font-normal text-[var(--color-ink-subtle)]">{label(role)}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <ThemeToggle className="w-full" />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <UserIcon className="mr-2 h-4 w-4" /> My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOutAction()}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
