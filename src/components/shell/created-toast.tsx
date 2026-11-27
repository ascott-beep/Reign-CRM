"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/shell/toast-provider";

/**
 * Round 4 screens 26/27 etc: "After saving, open the new record and show a
 * toast." A server action's `redirect()` happens before any client code can
 * run, so the toast can't be queued client-side first -- the destination
 * page carries a `?created=<message>` param instead, and this (dropped once
 * into that page) shows it via the Section 3 toast system, then strips the
 * param so a refresh doesn't repeat it. Reusable by any create flow.
 */
export function CreatedToast({ param = "created" }: { param?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const shown = useRef(false);

  useEffect(() => {
    const message = searchParams.get(param);
    if (!message || shown.current) return;
    shown.current = true;
    showToast({ kind: "success", title: message });
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
