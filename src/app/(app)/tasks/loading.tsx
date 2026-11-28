import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </header>
      <Skeleton className="h-11 w-full" />
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[2_1_560px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-10 w-full" />
          ))}
        </div>
        <div className="min-w-[280px] flex-1 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
