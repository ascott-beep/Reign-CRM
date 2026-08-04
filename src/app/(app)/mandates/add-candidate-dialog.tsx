"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addCandidateToMandateAction } from "./candidate-process-actions";

export function AddCandidateDialog({
  mandateId,
  candidates,
}: {
  mandateId: string;
  candidates: { id: string; firstName: string; lastName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [needsOverride, setNeedsOverride] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  async function submit(formData: FormData, overrideReason?: string) {
    setError(null);
    try {
      const result = await addCandidateToMandateAction(formData, overrideReason);
      if (result?.warning) setWarning(result.warning);
      else {
        setOpen(false);
        setNeedsOverride(false);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add candidate.";
      if (message === "OFF_LIMITS_OVERRIDE_REQUIRED") {
        setPendingFormData(formData);
        setNeedsOverride(true);
      } else {
        setError(message);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add candidate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add candidate to pipeline</DialogTitle>
        </DialogHeader>

        {needsOverride ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-status-danger-ink)]">
              This candidate or organisation is blocked by an off-limits restriction. Enter a reason to override (audited).
            </p>
            <Input
              placeholder="Override reason"
              onChange={(e) => {
                if (pendingFormData) pendingFormData.set("overrideReason", e.target.value);
              }}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setNeedsOverride(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (pendingFormData) submit(pendingFormData, String(pendingFormData.get("overrideReason") ?? "Override"));
                }}
              >
                Override and add
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs defaultValue="existing">
            <TabsList>
              <TabsTrigger value="existing">Existing candidate</TabsTrigger>
              <TabsTrigger value="new">New candidate</TabsTrigger>
            </TabsList>
            <TabsContent value="existing">
              <form action={(fd) => submit(fd)} className="flex flex-col gap-4">
                <input type="hidden" name="mandateId" value={mandateId} />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="candidatePersonId">Candidate</Label>
                  <Select name="candidatePersonId" required>
                    <SelectTrigger id="candidatePersonId">
                      <SelectValue placeholder="Select candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
                {warning ? <p className="text-sm text-[var(--color-status-warning-ink)]">Warning: {warning} (added anyway)</p> : null}
                <DialogFooter>
                  <Button type="submit">Add to pipeline</Button>
                </DialogFooter>
              </form>
            </TabsContent>
            <TabsContent value="new">
              <form action={(fd) => submit(fd)} className="flex flex-col gap-4">
                <input type="hidden" name="mandateId" value={mandateId} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="newCandidateFirstName">First name</Label>
                    <Input id="newCandidateFirstName" name="newCandidateFirstName" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="newCandidateLastName">Last name</Label>
                    <Input id="newCandidateLastName" name="newCandidateLastName" required />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="newCandidateEmail">Email</Label>
                  <Input id="newCandidateEmail" name="newCandidateEmail" type="email" />
                </div>
                {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
                <DialogFooter>
                  <Button type="submit">Create and add</Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
