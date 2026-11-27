"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { CURRENCIES } from "@/lib/iso";
import { upsertCandidateProfileAction } from "./actions";

/** Server components can't pass Prisma Decimal instances to client components — amounts are pre-serialized to strings. */
export type SerializedCandidateProfile = {
  status: string;
  rating: string;
  currentBaseAmount: string | null;
  currentBaseCurrency: string | null;
  expectedBaseAmount: string | null;
  expectedBaseCurrency: string | null;
  noticePeriodValue: number | null;
  noticePeriodUnit: string | null;
  careerSummary: string | null;
  motivation: string | null;
  consentStatus: string;
  legalBasis: string;
};

const STATUSES = [
  "PROSPECT",
  "OUTREACH_PLANNED",
  "CONTACTED",
  "ENGAGED",
  "QUALIFIED",
  "OPEN_TO_MOVE",
  "NOT_LOOKING",
  "UNAVAILABLE",
  "PLACED",
  "DORMANT",
  "DO_NOT_CONTACT",
  "ARCHIVED",
];
const RATINGS = ["A_STRONG", "B_RELEVANT", "C_UNQUALIFIED", "D_NOT_RELEVANT", "NOT_RATED"];
const CONSENT_STATUSES = ["NOT_REQUESTED", "REQUESTED", "GRANTED", "WITHDRAWN", "EXPIRED", "NOT_REQUIRED"];
const LEGAL_BASES = ["CONSENT", "LEGITIMATE_INTEREST", "CONTRACT", "LEGAL_OBLIGATION", "NOT_SET"];

export function CandidateProfileDialog({ personId, profile }: { personId: string; profile: SerializedCandidateProfile | null }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await upsertCandidateProfileAction(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Pencil className="h-4 w-4" /> {profile ? "Edit candidate profile" : "Create candidate profile"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Candidate profile</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="personId" value={personId} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={profile?.status ?? "PROSPECT"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rating">Rating</Label>
              <Select name="rating" defaultValue={profile?.rating ?? "NOT_RATED"}>
                <SelectTrigger id="rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATINGS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentBaseAmount">Current base</Label>
              <Input id="currentBaseAmount" name="currentBaseAmount" type="number" defaultValue={profile?.currentBaseAmount?.toString()} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentBaseCurrency">Currency</Label>
              <Select name="currentBaseCurrency" defaultValue={profile?.currentBaseCurrency ?? "GBP"}>
                <SelectTrigger id="currentBaseCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedBaseAmount">Expected base</Label>
              <Input id="expectedBaseAmount" name="expectedBaseAmount" type="number" defaultValue={profile?.expectedBaseAmount?.toString()} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedBaseCurrency">Currency</Label>
              <Select name="expectedBaseCurrency" defaultValue={profile?.expectedBaseCurrency ?? "GBP"}>
                <SelectTrigger id="expectedBaseCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="noticePeriodValue">Notice period</Label>
              <Input id="noticePeriodValue" name="noticePeriodValue" type="number" defaultValue={profile?.noticePeriodValue ?? undefined} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="noticePeriodUnit">Unit</Label>
              <Input id="noticePeriodUnit" name="noticePeriodUnit" placeholder="months" defaultValue={profile?.noticePeriodUnit ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="careerSummary">Career summary</Label>
            <Textarea id="careerSummary" name="careerSummary" rows={3} defaultValue={profile?.careerSummary ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="motivation">Motivation</Label>
            <Textarea id="motivation" name="motivation" rows={2} defaultValue={profile?.motivation ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consentStatus">Consent status</Label>
              <Select name="consentStatus" defaultValue={profile?.consentStatus ?? "NOT_REQUESTED"}>
                <SelectTrigger id="consentStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="legalBasis">Legal basis</Label>
              <Select name="legalBasis" defaultValue={profile?.legalBasis ?? "NOT_SET"}>
                <SelectTrigger id="legalBasis">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_BASES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save candidate profile</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
