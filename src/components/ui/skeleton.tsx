import { cn } from "@/lib/utils";

/** A pulsing placeholder block, used in loading.tsx files so the page shell renders instantly. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[4px] bg-[var(--color-chip)]", className)} />;
}
