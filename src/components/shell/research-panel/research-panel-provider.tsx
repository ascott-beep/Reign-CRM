"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { useToast } from "@/components/shell/toast-provider";
import { researchOrganizationNowAction, researchCompanyByNameAction, saveResearchSummaryAction } from "@/app/(app)/organisations/actions";
import { acceptIntelligenceItemAction, convertIntelligenceToOpportunityAction, acceptAndRemindIntelligenceItemAction } from "@/app/(app)/intelligence/actions";
import { suggestedActionFor } from "@/lib/rules";
import { label } from "@/lib/labels";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { IntelligenceType } from "@prisma/client";

type ResearchItem = { id: string; title: string; type: IntelligenceType; confidence: string; sources: { url: string; title: string | null }[] };
type ResearchResult = { signalsFound: number; items: ResearchItem[]; organization: { id: string; name: string } };

const ResearchPanelContext = createContext<{ openForOrganization: (id: string, name: string) => void; openByName: (name: string) => void } | null>(null);

export function useResearchPanel() {
  const ctx = useContext(ResearchPanelContext);
  if (!ctx) throw new Error("useResearchPanel must be used within ResearchPanelProvider");
  return ctx;
}

const READING_MESSAGES = ["Reading company sites", "Reading news and filings", "Reading LinkedIn", "Checking recent deals"];

function LoadingView({ companyName }: { companyName: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMessageIndex((i) => (i + 1) % READING_MESSAGES.length), 2500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Sparkles className="h-6 w-6 animate-pulse text-[var(--color-ai-icon)]" />
      <p className="text-sm font-medium text-[var(--color-ink)]">Researching {companyName}</p>
      <p className="text-xs text-[var(--color-ink-subtle)]">{READING_MESSAGES[messageIndex]}</p>
      <div className="mt-1 h-[3px] w-48 overflow-hidden rounded-full bg-[var(--color-chip)]">
        <div className="h-full w-1/3 animate-[research-sweep_1.4s_ease-in-out_infinite] rounded-full bg-[var(--color-ai-icon)]" />
      </div>
      <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">Typically takes 10 to 30 seconds.</p>
      <style>{`@keyframes research-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
}

function sourceCountLabel(n: number) {
  return `${n} source${n === 1 ? "" : "s"}`;
}

function ResultView({ result }: { result: ResearchResult }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set(result.items.map((i) => i.id)));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalSources = result.items.reduce((sum, i) => sum + i.sources.length, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function doSelected() {
    setBusy(true);
    try {
      for (const item of result.items) {
        if (!selected.has(item.id)) continue;
        const suggestion = suggestedActionFor({ type: item.type, organizationName: result.organization.name });
        if (suggestion.kind === "create_opportunity") await convertIntelligenceToOpportunityAction(item.id);
        else if (suggestion.kind === "update_record") await acceptIntelligenceItemAction(item.id);
        else await acceptAndRemindIntelligenceItemAction(item.id);
      }
      showToast({ kind: "undo", title: `Done ${selected.size} selected`, actionLabel: "Undo", onAction: () => router.refresh() });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveToOrganisation() {
    const summary = result.items.length > 0 ? result.items.map((i) => i.title).join(" ") : `No new signals found for ${result.organization.name}.`;
    await saveResearchSummaryAction(result.organization.id, summary);
    setSaved(true);
    showToast({ kind: "success", title: "Saved to organisation" });
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-[var(--color-line)] p-4">
        <p className="text-xs text-[var(--color-ink-subtle)]">Researched just now from {sourceCountLabel(totalSources)}</p>
      </div>

      {result.items.length === 0 ? (
        <p className="p-4 text-sm text-[var(--color-ink-subtle)]">No new signals found in the last 90 days.</p>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {result.items.map((item) => (
            <div key={item.id} className="border-b border-[var(--color-line)] pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
              <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                {label(item.type)} · {sourceCountLabel(item.sources.length)}
              </p>
            </div>
          ))}

          <div>
            <p className="mb-2 text-xs font-medium text-[var(--color-ink-subtle)]">Suggested next steps</p>
            <div className="flex flex-col gap-1.5">
              {result.items.map((item) => {
                const suggestion = suggestedActionFor({ type: item.type, organizationName: result.organization.name });
                return (
                  <label key={item.id} className="flex items-start gap-2.5 rounded-[6px] border border-[var(--color-line)] px-3 py-2.5 text-sm">
                    <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
                    <span>{suggestion.sentence}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-[var(--color-line)] p-3">
        <Button type="button" variant="secondary" onClick={saveToOrganisation} disabled={saved}>
          {saved ? "Saved" : "Save to organisation"}
        </Button>
        {result.items.length > 0 ? (
          <Button type="button" onClick={doSelected} disabled={busy || selected.size === 0} className="ml-auto">
            {busy ? "Working…" : `Do ${selected.size} selected`}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ResearchPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const run = useCallback(async (task: () => Promise<ResearchResult>, name: string) => {
    const runId = ++runIdRef.current;
    setCompanyName(name);
    setOpen(true);
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const r = await task();
      if (runIdRef.current === runId) setResult(r);
    } catch (e) {
      if (runIdRef.current === runId) setError(e instanceof Error ? e.message : "Research failed.");
    } finally {
      if (runIdRef.current === runId) setLoading(false);
    }
  }, []);

  const openForOrganization = useCallback((id: string, name: string) => run(() => researchOrganizationNowAction(id), name), [run]);
  const openByName = useCallback((name: string) => run(() => researchCompanyByNameAction(name), name), [run]);

  function close() {
    setOpen(false);
  }

  return (
    <ResearchPanelContext.Provider value={{ openForOrganization, openByName }}>
      {children}
      {open ? (
        <div
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-[440px] flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] shadow-xl"
        >
          <div className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-4 py-3">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-ai-icon)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-[var(--color-ink)]">{result?.organization.name ?? companyName}</p>
            </div>
            <button type="button" onClick={close} aria-label="Close" className="shrink-0 text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <LoadingView companyName={companyName} />
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-sm font-medium text-[var(--color-ink)]">Could not research {companyName}</p>
              <p className="text-xs text-[var(--color-ink-subtle)]">{error}</p>
            </div>
          ) : result ? (
            <ResultView result={result} />
          ) : null}
        </div>
      ) : null}
    </ResearchPanelContext.Provider>
  );
}
