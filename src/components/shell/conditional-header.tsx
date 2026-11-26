"use client";

import { usePathname } from "next/navigation";

/**
 * Overview (01-overview) carries its own desk picker / notifications / quick
 * create on its page header row instead of a separate top bar — this hides
 * the shared <Header> there so the two don't double up.
 */
export function ConditionalHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;
  return <>{children}</>;
}
