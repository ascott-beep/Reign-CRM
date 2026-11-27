"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { researchOrganizationNowAction } from "./actions";

/** Round 2 section 5 "'Research now' button on each company page runs the agent for that company immediately." */
export function ResearchNowButton({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            try {
              const { signalsFound } = await researchOrganizationNowAction(organizationId);
              setResult(signalsFound === 0 ? "No new signals found." : `${signalsFound} new signal${signalsFound === 1 ? "" : "s"} found.`);
              router.refresh();
            } catch (e) {
              setResult(e instanceof Error ? e.message : "Research failed.");
            }
          })
        }
      >
        <Sparkles className="h-[14px] w-[14px]" /> {pending ? "Researching…" : "Research now"}
      </Button>
      {result ? <span className="text-xs text-[var(--color-muted)]">{result}</span> : null}
    </div>
  );
}
