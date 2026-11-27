"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { label } from "@/lib/labels";
import { mergeOrganizationAction } from "./actions";

type OrgPreview = {
  id: string;
  name: string;
  website: string | null;
  hqCity: string | null;
  type: string;
  status: string;
  ownerId: string | null;
  ownerName: string;
};

type Field = "name" | "website" | "hq" | "status" | "owner";
type Picks = Record<Field, "survivor" | "duplicate">;

function Row({
  field,
  label: fieldLabel,
  survivorValue,
  duplicateValue,
  picks,
  onPick,
}: {
  field: Field;
  label: string;
  survivorValue: string;
  duplicateValue: string;
  picks: Picks;
  onPick: (field: Field, side: "survivor" | "duplicate") => void;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr_1fr] items-center gap-3 border-t border-[var(--color-line)] py-2.5 text-sm">
      <span className="text-[var(--color-muted)]">{fieldLabel}</span>
      {(["survivor", "duplicate"] as const).map((side) => (
        <button key={side} type="button" onClick={() => onPick(field, side)} className="flex items-center gap-2.5 text-left">
          <span className={`h-4 w-4 shrink-0 rounded-full border-[1.5px] ${picks[field] === side ? "border-[5px] border-[var(--color-navy)]" : "border-[var(--color-muted)]"}`} />
          <span className={picks[field] === side ? "font-medium text-[var(--color-ink)]" : "text-[var(--color-ink2)]"}>{side === "survivor" ? survivorValue : duplicateValue}</span>
        </button>
      ))}
    </div>
  );
}

/** d07 "Merge duplicate organisations" — field-by-field picker, survivor kept on the left. */
export function MergeOrganizationDialog({ survivorId, duplicateId, duplicateName, onClose }: { survivorId: string; duplicateId: string; duplicateName: string; onClose: () => void }) {
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [survivor, setSurvivor] = useState<OrgPreview | null>(null);
  const [duplicate, setDuplicate] = useState<OrgPreview | null>(null);
  const [picks, setPicks] = useState<Picks>({ name: "survivor", website: "survivor", hq: "survivor", status: "survivor", owner: "survivor" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = `${survivorId}:${duplicateId}`;

  useEffect(() => {
    fetch(`/api/organisations/merge-preview?survivorId=${survivorId}&duplicateId=${duplicateId}`)
      .then((r) => r.json())
      .then((d: { survivor: OrgPreview; duplicate: OrgPreview }) => {
        setSurvivor(d.survivor);
        setDuplicate(d.duplicate);
        setLoadedFor(key);
      })
      .catch(() => setError("Could not load these records."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = loadedFor === key ? { survivor, duplicate } : { survivor: null, duplicate: null };

  async function handleMerge() {
    if (!current.survivor || !current.duplicate) return;
    setPending(true);
    setError(null);
    try {
      await mergeOrganizationAction(survivorId, duplicateId, {
        name: picks.name === "duplicate" ? current.duplicate.name : undefined,
        website: picks.website === "duplicate" ? current.duplicate.website : undefined,
        hqCity: picks.hq === "duplicate" ? current.duplicate.hqCity : undefined,
      });
    } catch {
      // mergeOrganizationAction redirects on success (throws NEXT_REDIRECT) — only real errors land here.
      setError("Failed to merge these records.");
      setPending(false);
    }
  }

  function pick(field: Field, side: "survivor" | "duplicate") {
    setPicks((p) => ({ ...p, [field]: side }));
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Merge duplicate organisations</DialogTitle>
          <DialogDescription>Names match once Ltd, Limited, Grp and punctuation are removed. Pick the value to keep for each field.</DialogDescription>
        </DialogHeader>

        {!current.survivor || !current.duplicate ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">Loading…</p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-[110px_1fr_1fr] gap-3 pb-2 text-[13px] font-medium">
              <span />
              <span>{current.survivor.name} · kept</span>
              <span className="text-[var(--color-muted)]">{current.duplicate.name} · merged in</span>
            </div>
            <Row field="name" label="Name" survivorValue={current.survivor.name} duplicateValue={current.duplicate.name} picks={picks} onPick={pick} />
            <Row field="website" label="Website" survivorValue={current.survivor.website ?? ""} duplicateValue={current.duplicate.website ?? ""} picks={picks} onPick={pick} />
            <Row field="hq" label="Headquarters" survivorValue={current.survivor.hqCity ?? ""} duplicateValue={current.duplicate.hqCity ?? ""} picks={picks} onPick={pick} />
            <Row field="status" label="Status" survivorValue={label(current.survivor.status)} duplicateValue={label(current.duplicate.status)} picks={picks} onPick={pick} />
            <Row field="owner" label="Owner" survivorValue={current.survivor.ownerName} duplicateValue={current.duplicate.ownerName} picks={picks} onPick={pick} />

            <p className="mt-3 rounded-md bg-[var(--color-sunk)] px-3.5 py-3 text-[13px] text-[var(--color-ink2)]">
              Moves every mandate, opportunity, relationship and contact from {current.duplicate.name} to {current.survivor.name}. The duplicate record is archived.
            </p>
            {error ? <p className="mt-2 text-sm text-[var(--color-warn)]">{error}</p> : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleMerge} disabled={!current.survivor || pending}>
            {pending ? "Merging…" : `Merge into ${current.survivor?.name ?? duplicateName}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
