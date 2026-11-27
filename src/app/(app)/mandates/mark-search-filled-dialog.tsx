"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { markSearchFilledAction } from "./candidate-process-actions";

type FillableCandidate = { id: string; name: string; statusLabel: string; isPlaced: boolean };
type FillableData = { mandateTitle: string; orgName: string; candidates: FillableCandidate[]; guaranteeSummary: string; feeSummary: string };

/** d03 "Mark this search as filled" — opens from the check banner or from moving a mandate to Filled on the board. */
export function MarkSearchFilledDialog({
  open,
  mandateId,
  defaultCandidateProcessId,
  onClose,
  onDone,
}: {
  open: boolean;
  mandateId: string | null;
  defaultCandidateProcessId?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [data, setData] = useState<FillableData | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open || !mandateId) return;
    fetch(`/api/mandates/${mandateId}/fillable-candidates`)
      .then((r) => r.json())
      .then((d: FillableData) => {
        setData(d);
        setLoadedFor(mandateId);
        setSelected(defaultCandidateProcessId ?? d.candidates.find((c) => c.isPlaced)?.id ?? d.candidates[0]?.id ?? "");
      })
      .catch(() => setError("Could not load candidates for this search."));
  }, [open, mandateId, defaultCandidateProcessId]);

  if (!open || !mandateId) return null;
  const current = loadedFor === mandateId ? data : null;

  const others = current?.candidates.filter((c) => c.id !== selected) ?? [];

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await markSearchFilledAction(formData);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark this search as filled.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Mark this search as filled</DialogTitle>
          {current ? (
            <DialogDescription>
              {current.mandateTitle} · {current.orgName}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {!current ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">Loading…</p>
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-[18px] py-1">
            <input type="hidden" name="mandateId" value={mandateId} />
            <input type="hidden" name="candidateProcessId" value={selected} />

            <div>
              <Label>Who was placed</Label>
              {current.candidates.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">No candidates on this search to choose from.</p>
              ) : (
                <div className="rounded-md border border-[var(--color-line)]">
                  {current.candidates.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelected(c.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${i > 0 ? "border-t border-[var(--color-line)]" : ""} ${selected === c.id ? "bg-[var(--color-active)]" : ""}`}
                    >
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full border-[1.5px] ${selected === c.id ? "border-[5px] border-[var(--color-navy)]" : "border-[var(--color-muted)]"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-[var(--color-ink)]">{c.name}</span>
                        <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{c.statusLabel}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="placementDate">Placement date</Label>
                <Input id="placementDate" name="placementDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agreedBaseAmount">Final base salary</Label>
                <Input id="agreedBaseAmount" name="agreedBaseAmount" type="number" min={0} />
              </div>
              <div>
                <Label htmlFor="agreedBaseCurrency">Currency</Label>
                <Input id="agreedBaseCurrency" name="agreedBaseCurrency" defaultValue="GBP" maxLength={3} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Guarantee (from terms)</Label>
                <div className="flex h-10 items-center justify-between rounded-md border border-[var(--color-line)] bg-[var(--color-sunk)] px-3 text-sm">
                  <span className="truncate">{current.guaranteeSummary}</span>
                </div>
              </div>
              <div>
                <Label>Completion fee</Label>
                <div className="flex h-10 items-center justify-between rounded-md border border-[var(--color-line)] bg-[var(--color-sunk)] px-3 text-sm">
                  <span className="truncate">{current.feeSummary}</span>
                </div>
              </div>
            </div>

            {others.length > 0 ? (
              <div className="rounded-md bg-[var(--color-sunk)] px-4 py-3.5 text-[13.5px] leading-relaxed">
                <strong className="font-medium">
                  {others.length} other candidate{others.length === 1 ? "" : "s"} will be told
                </strong>{" "}
                the search has been filled: {others.map((o) => o.name).join(", ")}.
                <label className="mt-2.5 flex cursor-pointer items-center gap-2.5 text-[13.5px] text-[var(--color-ink)]">
                  <Checkbox name="notifyOthers" value="true" defaultChecked />
                  Add a task to let each of them know
                </label>
              </div>
            ) : null}

            {error ? <p className="text-sm text-[var(--color-warn)]">{error}</p> : null}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !selected}>
                {pending ? "Saving…" : "Mark as filled"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
