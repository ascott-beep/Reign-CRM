"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Sun, Moon, MonitorCog } from "lucide-react";
import { setThemeAction } from "@/lib/theme-actions";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/** The explicit choice (cookie), not the theme actually rendered — "system" means no cookie is set. */
function getSnapshot(): Theme {
  const match = document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/);
  return match ? (match[1] as Theme) : "system";
}

// Server render can't read a client-only cookie match without risking a
// hydration mismatch, so it reports "system" here — corrected to the real
// value on the client's first paint, same as any other client-only read.
function getServerSnapshot(): Theme {
  return "system";
}

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  listeners.forEach((l) => l());
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: MonitorCog },
];

export function ThemeToggle({ className }: { className?: string }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [, startTransition] = useTransition();

  function choose(theme: Theme) {
    applyTheme(theme);
    startTransition(() => {
      setThemeAction(theme);
    });
  }

  return (
    <div className={cn("inline-flex items-center rounded-control border border-[var(--color-line)] p-[3px]", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-pressed={current === value}
          className={cn(
            "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[2px] px-2 text-[12.5px] transition-colors",
            current === value ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
          )}
        >
          <Icon className="h-3.5 w-3.5" /> {label}
        </button>
      ))}
    </div>
  );
}
