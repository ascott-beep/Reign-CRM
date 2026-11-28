import { Skeleton } from "@/components/ui/skeleton";

export default function MandatesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </header>
      <div className="flex gap-3.5 overflow-hidden">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="flex min-w-[260px] flex-1 flex-col gap-3 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-3">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
