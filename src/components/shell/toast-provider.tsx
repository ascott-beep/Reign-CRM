"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastKind = "undo" | "success" | "error";

export type ShowToastInput = {
  kind: ToastKind;
  title: string;
  body?: string;
  /** "Undo" on an undo toast, "View" on a success toast, "Retry" on an error toast -- whatever the action does. */
  actionLabel?: string;
  onAction?: () => void;
};

type Toast = ShowToastInput & { id: string };

const DURATIONS: Record<ToastKind, number | null> = { undo: 8000, success: 4000, error: null };

const ToastContext = createContext<{ showToast: (input: ShowToastInput) => void } | null>(null);

/**
 * Round 4 screen 06 (R4Toasts). One place to show a toast after any action
 * instead of the old URL-param-driven UndoDeleteToast: `showToast({ kind:
 * "undo", title, actionLabel: "Undo", onAction })` etc. Every server action
 * that changes something should pair its revalidatePath/router.refresh
 * (Part A item 1) with a toast here -- delete already does; stage changes
 * are wired as the second example (see opportunity-header-actions.tsx /
 * interactive-stage-bar.tsx). The rest can adopt it incrementally.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((input: ShowToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Newest first in the array, max 3 on screen -- see the column-reverse
    // stack below for why newest-first renders at the bottom.
    setToasts((prev) => [{ ...input, id }, ...prev].slice(0, 3));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex w-[400px] flex-col-reverse gap-[10px]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const duration = DURATIONS[toast.kind];
  const remainingRef = useRef(duration ?? 0);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arm = useCallback(() => {
    if (duration === null) return;
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(onDismiss, remainingRef.current);
  }, [duration, onDismiss]);

  useEffect(() => {
    arm();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pause() {
    if (duration === null || !timerRef.current) return;
    clearTimeout(timerRef.current);
    remainingRef.current -= Date.now() - startedAtRef.current;
  }

  function resume() {
    if (duration === null) return;
    arm();
  }

  const isUndo = toast.kind === "undo";
  const isError = toast.kind === "error";

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={resume}
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-[6px] border px-4 py-3.5 shadow-[var(--shadow-overlay)]",
        isUndo
          ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-navy-ink)]"
          : "border-[var(--color-line)] bg-[var(--color-card)] text-[var(--color-ink)]",
      )}
    >
      {!isUndo ? (
        isError ? (
          <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-warn)]" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-pos)]" />
        )
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium leading-snug">{toast.title}</p>
        {toast.body ? <p className={cn("mt-0.5 text-[13px] leading-snug", isUndo ? "opacity-80" : "text-[var(--color-ink-subtle)]")}>{toast.body}</p> : null}
      </div>
      {toast.actionLabel && toast.onAction ? (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.();
            onDismiss();
          }}
          className={cn("shrink-0 text-[13px] font-medium", isUndo ? "text-[var(--color-navy-ink)] underline" : "text-[var(--color-accent)] hover:underline")}
        >
          {toast.actionLabel}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={cn("shrink-0", isUndo ? "text-[var(--color-navy-ink)] opacity-70 hover:opacity-100" : "text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
