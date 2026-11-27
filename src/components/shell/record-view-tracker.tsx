"use client";

import { useEffect } from "react";
import { pushRecentRecord, type RecentRecordType } from "@/lib/recent-records";

/** Drop this (no visible output) on a record page to register it for the Ask AI panel's "Recent" list. */
export function RecordViewTracker({ type, id, label, meta, href }: { type: RecentRecordType; id: string; label: string; meta: string; href: string }) {
  useEffect(() => {
    pushRecentRecord({ type, id, label, meta, href });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);
  return null;
}
