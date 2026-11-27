"use client";

import { useEffect, useState } from "react";
import { Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const CATEGORIES = [
  { key: "profile", label: "Profile and contact details" },
  { key: "consent", label: "Consent and legal basis" },
  { key: "searches", label: "Searches and stages" },
  { key: "activity", label: "Activity and notes" },
  { key: "emails", label: "Emails" },
  { key: "documents", label: "Documents" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

const FORMAT_OPTIONS = [
  { value: "csv", label: "PDF and spreadsheet" },
  { value: "json", label: "JSON" },
] as const;

/** Round 4 screen 24 (DlgR4Gdpr) — "Download data for <name>", admins only, from the person's ⋯ menu. */
export function DownloadDataDialog({ open, onClose, personId, personName }: { open: boolean; onClose: () => void; personId: string; personName: string }) {
  const [checked, setChecked] = useState<Record<CategoryKey, boolean>>({ profile: true, consent: true, searches: true, activity: true, emails: true, documents: true });
  const [format, setFormat] = useState<(typeof FORMAT_OPTIONS)[number]["value"]>("csv");
  const [details, setDetails] = useState<Partial<Record<CategoryKey, string>>>({});

  useEffect(() => {
    if (!open) return;
    fetch(`/api/people/${personId}/gdpr-export?summary=true`)
      .then((r) => r.json())
      .then((d) => setDetails(d))
      .catch(() => setDetails({}));
  }, [open, personId]);

  const selectedCategories = CATEGORIES.filter((c) => checked[c.key]).map((c) => c.key);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Download data for {personName}</DialogTitle>
          <DialogDescription>Everything Atlas holds about this person, for a subject access request.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          {CATEGORIES.map((c) => (
            <label key={c.key} className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] py-2.5 text-[13.5px] first:border-t-0">
              <span className="flex items-center gap-2.5">
                <Checkbox checked={checked[c.key]} onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [c.key]: v === true }))} />
                {c.label}
              </span>
              {details[c.key] ? <span className="text-xs text-[var(--color-ink-subtle)]">{details[c.key]}</span> : null}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-[var(--color-ink-subtle)]">Format</span>
          <SegmentedToggle options={FORMAT_OPTIONS} value={format} onChange={setFormat} />
        </div>

        <div className="flex items-start gap-2.5 rounded-[6px] bg-[var(--color-sunk)] px-3.5 py-3 text-[13px] text-[var(--color-ink-subtle)]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The download is logged in the audit log with your name and the date.
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={selectedCategories.length === 0} asChild>
            <a
              href={`/api/people/${personId}/gdpr-export?categories=${selectedCategories.join(",")}&format=${format}`}
              download
              onClick={(e) => {
                if (selectedCategories.length === 0) {
                  e.preventDefault();
                  return;
                }
                onClose();
              }}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
