"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock } from "lucide-react";
import { toggleActivityPrivateAction } from "@/app/(app)/activities/composer-actions";

/** Round 2 section 7 — owner/creator-only control next to a private email in the timeline. */
export function ActivityPrivacyToggle({ activityId, isPrivate }: { activityId: string; isPrivate: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title={isPrivate ? "Private — only you can see the content. Click to make visible to others." : "Make this email private"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleActivityPrivateAction(activityId);
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1 text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] disabled:opacity-50"
    >
      {isPrivate ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
    </button>
  );
}
