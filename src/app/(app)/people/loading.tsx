import { Skeleton } from "@/components/ui/skeleton";

export default function PeopleLoading() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </header>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-60" />
      </div>
      <div className="overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[var(--color-line)] px-5 py-3 last:border-b-0">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
