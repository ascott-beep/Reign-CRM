"use client";

import Link from "next/link";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { initials } from "@/lib/utils";

/**
 * Round 2 section 3 — "hovering a person, company or user name shows a
 * small preview card." Takes whatever the page already loaded (no extra
 * fetch) and just needs a moment's hover before it opens.
 */
export function PersonHoverCard({
  personId,
  firstName,
  lastName,
  title,
  companyName,
  email,
  children,
}: {
  personId: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  companyName?: string | null;
  email?: string | null;
  children: React.ReactNode;
}) {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-[12px] font-semibold text-[var(--color-navy-ink)]">
            {initials(firstName, lastName)}
          </span>
          <div className="min-w-0">
            <Link href={`/people/${personId}`} className="block truncate text-sm font-medium text-[var(--color-ink)] hover:underline">
              {firstName} {lastName}
            </Link>
            {title ? (
              <div className="truncate text-xs text-[var(--color-muted)]">
                {title}
                {companyName ? ` · ${companyName}` : ""}
              </div>
            ) : null}
            {email ? <div className="mt-1.5 truncate text-xs text-[var(--color-ink2)]">{email}</div> : null}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function OrganizationHoverCard({
  organizationId,
  name,
  typeLabel,
  detail,
  children,
}: {
  organizationId: string;
  name: string;
  typeLabel?: string | null;
  detail?: string | null;
  children: React.ReactNode;
}) {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent>
        <Link href={`/organisations/${organizationId}`} className="block truncate text-sm font-medium text-[var(--color-ink)] hover:underline">
          {name}
        </Link>
        {typeLabel ? <div className="mt-1 truncate text-xs text-[var(--color-muted)]">{typeLabel}</div> : null}
        {detail ? <div className="mt-1.5 truncate text-xs text-[var(--color-ink2)]">{detail}</div> : null}
      </HoverCardContent>
    </HoverCard>
  );
}

export function UserHoverCard({
  firstName,
  lastName,
  roleLabel,
  children,
}: {
  firstName: string;
  lastName: string;
  roleLabel?: string | null;
  children: React.ReactNode;
}) {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-auto">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-[12px] font-semibold text-[var(--color-navy-ink)]">
            {initials(firstName, lastName)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[var(--color-ink)]">
              {firstName} {lastName}
            </div>
            {roleLabel ? <div className="truncate text-xs text-[var(--color-muted)]">{roleLabel}</div> : null}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
