import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral-ink)] border-transparent",
        success: "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-ink)] border-transparent",
        warning: "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-ink)] border-transparent",
        danger: "bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-ink)] border-transparent",
        info: "bg-[var(--color-status-info-bg)] text-[var(--color-status-info-ink)] border-transparent",
        outline: "border-[var(--color-border-strong)] text-[var(--color-ink-muted)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}

export { Badge, badgeVariants };
