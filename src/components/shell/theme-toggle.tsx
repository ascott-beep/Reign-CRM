"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Sun, Moon } from "lucide-react";
import { setThemeAction } from "@/lib/theme-actions";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

// Server render can't know the cookie/system theme without risking a
// hydration mismatch, so it reports "light" here — corrected to the real
// value on the client's first paint, same as any other client-only read.
function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  listeners.forEach((l) => l());
}

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
      <button
        type="button"
        onClick={() => choose("light")}
        aria-pressed={current === "light"}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-[2px] px-2.5 text-[12.5px] transition-colors",
          current === "light" ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
        )}
      >
        <Sun className="h-3.5 w-3.5" /> Light
      </button>
      <button
        type="button"
        onClick={() => choose("dark")}
        aria-pressed={current === "dark"}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-[2px] px-2.5 text-[12.5px] transition-colors",
          current === "dark" ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
        )}
      >
        <Moon className="h-3.5 w-3.5" /> Dark
      </button>
    </div>
  );
}
