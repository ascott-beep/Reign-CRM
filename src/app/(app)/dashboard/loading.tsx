import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="-mx-3 -mb-4 -mt-2.5 flex flex-1 flex-col gap-3.5">
      <header className="flex flex-none items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-8 w-32" />
      </header>

      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </section>

      <section className="flex min-h-[280px] flex-1 flex-wrap gap-3.5">
        <div className="min-w-0 flex-[5_1_360px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-2.5 pt-[18px]">
          <Skeleton className="h-4 w-20" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-[7_1_460px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-4 pt-[18px]">
          <Skeleton className="h-4 w-28" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-[260px] flex-1 flex-wrap gap-3.5">
        <div className="min-w-0 flex-[7_1_460px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-4 pt-[18px]">
          <Skeleton className="h-4 w-24" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-[5_1_360px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-3.5 pt-[18px]">
          <Skeleton className="h-4 w-28" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
