import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Round 5 screen 14 -- shown instead of an empty, greyed-out review queue when no AI key is set. Log signal and the Signal log still work regardless, since they live in the page header, not inside this card. */
export function AiNotConnectedCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-6 py-16 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ai-bg)]">
        <Sparkles className="h-4 w-4 text-[var(--color-ai-icon)]" />
      </span>
      <p className="text-[15px] font-medium text-[var(--color-ink)]">AI not connected</p>
      <Button asChild>
        <Link href="/settings/connections">Set up in Connections</Link>
      </Button>
    </div>
  );
}
