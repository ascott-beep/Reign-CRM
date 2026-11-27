"use client";

import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { addCandidateToMandateAction } from "./candidate-process-actions";

export type CandidateOption = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  /** This person's current CandidateProcessStage on this mandate, if any. */
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

export function AddCandidateDialog({
  mandateId,
  mandateTitle,
  orgName,
  candidates,
}: {
  mandateId: string;
  mandateTitle: string;
  orgName: string;
  candidates: CandidateOption[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "new">("search");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startAt, setStartAt] = useState<(typeof START_AT)[number]["value"]>("SOURCED");
  const [fit, setFit] = useState<(typeof FIT)[number]["value"] | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [needsOverride, setNeedsOverride] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [pending, setPending] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates.slice(0, 8);
    return candidates.filter((c) => `${c.firstName} ${c.lastName} ${c.title ?? ""}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query, candidates]);

  function reset() {
    setMode("search");
    setQuery("");
    setSelectedId(null);
    setStartAt("SOURCED");
    setFit("");
    setNote("");
    setError(null);
    setWarning(null);
    setNeedsOverride(false);
  }

  async function submit(formData: FormData, overrideReason?: string) {
    setError(null);
    setPending(true);
    try {
      const result = await addCandidateToMandateAction(formData, overrideReason);
      if (result?.warning) setWarning(result.warning);
      else {
        setOpen(false);
        reset();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add candidate.";
      if (message === "OFF_LIMITS_OVERRIDE_REQUIRED") {
        setPendingFormData(formData);
        setNeedsOverride(true);
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  }

  function handleSearchSubmit(formData: FormData) {
    if (!selectedId) {
      setError("Choose a person first.");
      return;
    }
    formData.set("candidatePersonId", selectedId);
    formData.set("startAt", startAt);
    if (fit) formData.set("fit", fit);
    formData.set("note", note);
    submit(formData);
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
          <Plus className="h-[14px] w-[14px]" /> Add candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Add a candidate to this search</DialogTitle>
          <DialogDescription>
            {mandateTitle} · {orgName}
          </DialogDescription>
        </DialogHeader>

        {needsOverride ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-warn)]">
              This candidate or organisation is blocked by an off-limits restriction. Enter a reason to override (audited).
            </p>
            <Input placeholder="Override reason" onChange={(e) => pendingFormData?.set("overrideReason", e.target.value)} />
            <DialogFooter>
              <Button variant="secondary" onClick={() => setNeedsOverride(false)}>
                Cancel
              </Button>
              <Button onClick={() => pendingFormData && submit(pendingFormData, String(pendingFormData.get("overrideReason") ?? "Override"))}>
                Override and add
              </Button>
            </DialogFooter>
          </div>
        ) : mode === "search" ? (
          <form action={handleSearchSubmit} className="flex flex-col gap-[18px] py-1">
            <input type="hidden" name="mandateId" value={mandateId} />

            <label className="flex h-11 items-center gap-2.5 rounded-md border border-[var(--color-navy)] px-3">
              <Search className="h-4 w-4 text-[var(--color-muted)]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people"
                aria-label="Search people"
                className="flex-1 border-0 bg-transparent text-sm text-[var(--color-ink)] outline-none"
              />
            </label>

            <div className="rounded-md border border-[var(--color-line)]">
              {results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-[var(--color-muted)]">No matches.</p>
              ) : (
                results.map((c, i) => {
                  const isActive = c.existingStage && c.existingStage !== "REJECTED" && c.existingStage !== "WITHDRAWN";
                  const isRejected = c.existingStage === "REJECTED";
                  const disabled = Boolean(isActive);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${i > 0 ? "border-t border-[var(--color-line)]" : ""} ${
                        selectedId === c.id ? "bg-[var(--color-active)]" : ""
                      } ${disabled ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full border-[1.5px] ${
                          disabled ? "opacity-0" : selectedId === c.id ? "border-[5px] border-[var(--color-navy)]" : "border-[var(--color-muted)]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${disabled ? "text-[var(--color-muted)]" : "text-[var(--color-ink)]"}`}>
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{c.title ?? "—"}</span>
                      </span>
                      {isActive ? <Badge tone="neutral">Already on this search</Badge> : null}
                      {isRejected ? <Badge tone="neutral">Rejected from this search</Badge> : null}
                    </button>
                  );
                })
              )}
              <div className="border-t border-[var(--color-line)] px-3 py-3">
                <button type="button" onClick={() => setMode("new")} className="text-[13.5px] text-[var(--color-ink2)]">
                  + Create a new person
                </button>
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-[13px] text-[var(--color-ink2)]">Start them at</span>
              <SegmentedToggle options={START_AT} value={startAt} onChange={setStartAt} />
              <p className="mt-1.5 text-xs text-[var(--color-muted)]">Identified = on the longlist. Approached = you have already been in touch.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="mb-1.5 block text-[13px] text-[var(--color-ink2)]">Fit</span>
                <SegmentedToggle options={FIT} value={fit || "B_RELEVANT"} onChange={setFit} className={fit ? "" : "opacity-60"} />
              </div>
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
                {pending ? "Adding…" : "Add to search"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form action={(fd) => submit(fd)} className="flex flex-col gap-4">
            <input type="hidden" name="mandateId" value={mandateId} />
            <input type="hidden" name="startAt" value={startAt} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newCandidateFirstName">First name</Label>
                <Input id="newCandidateFirstName" name="newCandidateFirstName" required />
              </div>
              <div>
                <Label htmlFor="newCandidateLastName">Last name</Label>
                <Input id="newCandidateLastName" name="newCandidateLastName" required />
              </div>
            </div>
            <div>
              <Label htmlFor="newCandidateEmail">Email</Label>
              <Input id="newCandidateEmail" name="newCandidateEmail" type="email" />
            </div>
            {error ? <p className="text-sm text-[var(--color-warn)]">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setMode("search")}>
                Back
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Adding…" : "Create and add"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
