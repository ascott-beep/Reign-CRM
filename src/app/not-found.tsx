import Link from "next/link";
import { AtlasLogo } from "@/components/brand/atlas-logo";
import { Button } from "@/components/ui/button";

/** Round 4 screen 07 (R4States) -- 404 and 500 share this layout: mark, bold heading, one helper sentence, two actions. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--color-bg)] px-6 text-center">
      <AtlasLogo className="h-7 w-auto text-[var(--color-ink)]" />
      <div>
        <h1 className="text-[22px] font-medium text-[var(--color-ink)]">Page not found</h1>
        <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-subtle)]">This record may have been deleted, or the link is out of date.</p>
      </div>
      <div className="flex items-center gap-2.5">
        <Button asChild>
          <Link href="/dashboard">Go to Overview</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/settings/recently-deleted">Recently deleted</Link>
        </Button>
      </div>
    </div>
  );
}
