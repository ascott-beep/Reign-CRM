"use client";

import { AtlasLogo } from "@/components/brand/atlas-logo";
import { Button } from "@/components/ui/button";

/**
 * Round 4 screen 07 (R4States) -- same 500 layout as the root src/app/error.tsx,
 * but scoped to the signed-in app shell so it still gets the real theme and
 * font (the root one is a last-resort fallback for when the root layout
 * itself fails, where Next.js requires a bare html/body with none of that).
 */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <AtlasLogo className="h-7 w-auto text-[var(--color-ink)]" />
      <div>
        <h1 className="text-[22px] font-medium text-[var(--color-ink)]">Something went wrong on our side</h1>
        <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-subtle)]">Your data is safe. Try again, or come back in a moment.</p>
      </div>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
