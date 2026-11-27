"use client";

import { AtlasLogo } from "@/components/brand/atlas-logo";
import { Button } from "@/components/ui/button";

/** Round 4 screen 07 (R4States) -- the 500 half of the shared 404/500 layout. Next.js error boundaries must be Client Components. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--color-bg)] px-6 text-center">
          <AtlasLogo className="h-7 w-auto text-[var(--color-ink)]" />
          <div>
            <h1 className="text-[22px] font-medium text-[var(--color-ink)]">Something went wrong on our side</h1>
            <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-subtle)]">Your data is safe. Try again, or come back in a moment.</p>
          </div>
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
