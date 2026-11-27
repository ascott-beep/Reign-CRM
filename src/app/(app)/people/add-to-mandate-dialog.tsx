"use client";

import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { addCandidateToMandateAction } from "../mandates/candidate-process-actions";

export type MandateOption = {
  id: string;
  title: string;
  orgName: string;
  /** This candidate's existing CandidateProcessStage on this mandate, if any. */
  existingStage?: string | null;
};

const START_AT = [
  { value: "SOURCED", label: "Identified" },
  { value: "CONTACT_REQUIRED", label: "Approached" },
] as const;

const FIT = [
  { value: "A_STRONG", label: "Strong" },
  { value: "B_RELEVANT", label: "Good" },
  { value: "C_UNQUALIFIED", label: "Possible" },
] as const;

/** Reverse of mandates/add-candidate-dialog.tsx — starts from the person, picks the mandate. */
export function AddToMandateDialog({ candidatePersonId, mandates }: { candidatePersonId: string; mandates: MandateOption[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startAt, setStartAt] = useState<(typeof START_AT)[number]["value"]>("SOURCED");
  const [fit, setFit] = useState<(typeof FIT)[number]["value"] | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mandates.slice(0, 8);
    return mandates.filter((m) => `${m.title} ${m.orgName}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query, mandates]);

  function reset() {
    setQuery("");
    setSelectedId(null);
    setStartAt("SOURCED");
    setFit("");
    setNote("");
    setError(null);
    setWarning(null);
  }

  async function handleSubmit(formData: FormData) {
    if (!selectedId) {
      setError("Choose a mandate first.");
      return;
    }
    setError(null);
    setPending(true);
    formData.set("mandateId", selectedId);
    formData.set("candidatePersonId", candidatePersonId);
    formData.set("startAt", startAt);
    if (fit) formData.set("fit", fit);
    formData.set("note", note);
    try {
      const result = await addCandidateToMandateAction(formData);
      if (result?.warning) setWarning(result.warning);
      else {
        setOpen(false);
        reset();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add to this mandate.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-[14px] w-[14px]" /> Add to mandate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Add to a mandate</DialogTitle>
          <DialogDescription>Pick a live search to put this candidate on.</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-[18px] py-1">
          <label className="flex h-11 items-center gap-2.5 rounded-md border border-[var(--color-navy)] px-3">
            <Search className="h-4 w-4 text-[var(--color-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mandates"
              aria-label="Search mandates"
              className="flex-1 border-0 bg-transparent text-sm text-[var(--color-ink)] outline-none"
            />
          </label>

          <div className="rounded-md border border-[var(--color-line)]">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--color-muted)]">No matches.</p>
            ) : (
              results.map((m, i) => {
                const isActive = m.existingStage && m.existingStage !== "REJECTED" && m.existingStage !== "WITHDRAWN";
                const isRejected = m.existingStage === "REJECTED";
                const disabled = Boolean(isActive);
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedId(m.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${i > 0 ? "border-t border-[var(--color-line)]" : ""} ${
                      selectedId === m.id ? "bg-[var(--color-active)]" : ""
                    } ${disabled ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border-[1.5px] ${
                        disabled ? "opacity-0" : selectedId === m.id ? "border-[5px] border-[var(--color-navy)]" : "border-[var(--color-muted)]"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${disabled ? "text-[var(--color-muted)]" : "text-[var(--color-ink)]"}`}>{m.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{m.orgName}</span>
                    </span>
                    {isActive ? <Badge tone="neutral">Already on this search</Badge> : null}
                    {isRejected ? <Badge tone="neutral">Rejected from this search</Badge> : null}
                  </button>
                );
              })
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-[13px] text-[var(--color-ink2)]">Start them at</span>
            <SegmentedToggle options={START_AT} value={startAt} onChange={setStartAt} />
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">Identified = on the longlist. Approached = you have already been in touch.</p>
          </div>

          <div>
            <span className="mb-1.5 block text-[13px] text-[var(--color-ink2)]">Fit</span>
            <SegmentedToggle options={FIT} value={fit || "B_RELEVANT"} onChange={setFit} className={fit ? "" : "opacity-60"} />
          </div>

          <div>
            <Label>Note</Label>
            <Textarea rows={3} placeholder="Why they fit this role" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error ? <p className="text-sm text-[var(--color-warn)]">{error}</p> : null}
          {warning ? <p className="text-sm text-[var(--color-warn)]">Warning: {warning} (added anyway)</p> : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add to mandate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
