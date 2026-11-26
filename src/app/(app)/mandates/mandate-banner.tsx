"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import type { MandateBanner as MandateBannerData } from "@/lib/rules";
import { changeMandateStatusAction } from "./actions";
import { MarkSearchFilledDialog } from "./mark-search-filled-dialog";

export function MandateBanner({ mandateId, banner }: { mandateId: string; banner: MandateBannerData }) {
  const [dismissed, setDismissed] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  if (dismissed) return null;

  if (banner.key === "offer_before_mandate_offer") {
    return (
      <Banner
        message={banner.message}
        action={
          <Button size="sm" onClick={() => startTransition(() => changeMandateStatusAction({ mandateId, toStatus: "OFFER" }))}>
            Move search to Offer
          </Button>
        }
        onDismiss={
          <button type="button" onClick={() => setDismissed(true)} className="h-8 px-3 text-[13px] text-[var(--color-chip-strong-ink)] opacity-80">
            Not yet
          </button>
        }
      />
    );
  }

  return (
    <>
      <Banner
        message={banner.message}
        action={
          <Button size="sm" onClick={() => setFillOpen(true)}>
            Mark search as filled
          </Button>
        }
        onDismiss={
          <button type="button" onClick={() => setDismissed(true)} className="h-8 px-3 text-[13px] text-[var(--color-chip-strong-ink)] opacity-80">
            Not yet
          </button>
        }
      />
      <MarkSearchFilledDialog
        open={fillOpen}
        mandateId={mandateId}
        defaultCandidateProcessId={banner.candidateProcessId ?? null}
        onClose={() => setFillOpen(false)}
        onDone={() => {
          setFillOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
