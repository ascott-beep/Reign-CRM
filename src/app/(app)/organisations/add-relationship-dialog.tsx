"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { addOrganizationRelationshipAction } from "./actions";

const RELATIONSHIP_TYPES = [
  "CURRENT_INVESTOR_IN",
  "FORMER_INVESTOR_IN",
  "CO_INVESTOR_WITH",
  "PARENT_OF",
  "SUBSIDIARY_OF",
  "ADVISER_TO",
  "LENDER_TO",
  "PARTNER_OF",
  "OTHER",
];
const INVESTMENT_STATUSES = ["ANNOUNCED", "CURRENT", "PARTIALLY_EXITED", "EXITED", "UNKNOWN"];

export function AddRelationshipDialog({
  organizationId,
  organizations,
}: {
  organizationId: string;
  organizations: { id: string; name: string; type: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await addOrganizationRelationshipAction(formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="h-4 w-4" /> Add relationship
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add organisation relationship</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="sourceOrganizationId" value={organizationId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="targetOrganizationId">Related organisation</Label>
            <Select name="targetOrganizationId" required>
              <SelectTrigger id="targetOrganizationId">
                <SelectValue placeholder="Select organisation" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name} ({label(o.type)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Relationship type</Label>
            <Select name="type" required defaultValue="CURRENT_INVESTOR_IN">
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {label(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="investmentStatus">Investment status</Label>
            <Select name="investmentStatus">
              <SelectTrigger id="investmentStatus">
                <SelectValue placeholder="N/A" />
              </SelectTrigger>
              <SelectContent>
                {INVESTMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {label(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="investmentDate">Investment date</Label>
              <Input id="investmentDate" name="investmentDate" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exitDate">Exit date</Label>
              <Input id="exitDate" name="exitDate" type="date" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ownershipPercentage">Ownership %</Label>
            <Input id="ownershipPercentage" name="ownershipPercentage" type="number" min={0} max={100} step="0.1" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="isLeadInvestor" value="true" /> Lead investor
          </label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
          <DialogFooter>
            <Button type="submit">Add relationship</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
