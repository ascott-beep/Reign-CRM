"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { addEmploymentHistoryAction } from "./actions";

const SENIORITIES = [
  "BOARD_OR_C_SUITE",
  "N_MINUS_1",
  "DIRECTOR_OR_VP",
  "HEAD_OF",
  "SENIOR_MANAGER",
  "MANAGER",
  "INDIVIDUAL_CONTRIBUTOR",
  "CONSULTANT_OR_INTERIM",
  "OTHER",
];
const EMPLOYMENT_TYPES = ["PERMANENT", "INTERIM", "FRACTIONAL", "FIXED_TERM", "CONTRACT"];
const WORK_ARRANGEMENTS = ["ON_SITE", "HYBRID", "REMOTE", "FLEXIBLE"];

export function EmploymentHistoryDialog({
  personId,
  organizations,
}: {
  personId: string;
  organizations: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await addEmploymentHistoryAction(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="h-4 w-4" /> Add employment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add employment history</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="personId" value={personId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jobTitle">Job title</Label>
            <Input id="jobTitle" name="jobTitle" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organizationId">Employer (if in CRM)</Label>
            <Select name="organizationId">
              <SelectTrigger id="organizationId">
                <SelectValue placeholder="Select organisation" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employerNameFallback">Employer name (if not in CRM)</Label>
            <Input id="employerNameFallback" name="employerNameFallback" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seniority">Seniority</Label>
              <Select name="seniority">
                <SelectTrigger id="seniority">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {SENIORITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employmentType">Employment type</Label>
              <Select name="employmentType">
                <SelectTrigger id="employmentType">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((s) => (
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
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workArrangement">Work arrangement</Label>
              <Select name="workArrangement">
                <SelectTrigger id="workArrangement">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_ARRANGEMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsibilities">Responsibilities</Label>
            <Textarea id="responsibilities" name="responsibilities" rows={2} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="isCurrent" value="true" /> Current role
            </label>
            <Select name="peBackedDuringTenure">
              <SelectTrigger>
                <SelectValue placeholder="PE-backed during tenure?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Add employment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
