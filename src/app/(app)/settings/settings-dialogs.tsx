"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { createLookupItemAction, createTagAction, createCustomFieldAction, inviteUserAction, type SettingsFormState, type LookupKind } from "./actions";

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : text}
    </Button>
  );
}

const INVITE_ROLES = [
  { value: "ADMIN", label: "Admin", description: "Full access, including settings, deleting records and managing users." },
  { value: "STANDARD", label: "Consultant", description: "Can create and edit records. Can't change workspace settings." },
  { value: "READ_ONLY", label: "Read only", description: "Can view everything but can't make changes." },
] as const;

/** d13 — invites a user by email instead of setting a temporary password. */
export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("STANDARD");
  const [state, formAction] = useActionState<SettingsFormState, FormData>(inviteUserAction, {});
  const errors = state.errors ?? {};

  if (state.success && open) setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" placeholder="e.g. Jamie" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" placeholder="e.g. Okafor" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" name="email" type="email" placeholder="e.g. jamie@reign.partners" required />
            <p className="text-xs text-[var(--color-ink-subtle)]">We&apos;ll email them a link to set a password. It lasts 7 days.</p>
            {errors.email ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.email[0]}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <input type="hidden" name="role" value={role} />
            <div className="flex flex-col gap-2">
              {INVITE_ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                    role === r.value
                      ? "border-[var(--color-accent)] bg-[var(--color-canvas)]"
                      : "border-[var(--color-border-strong)]"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-[var(--color-ink)]">
                    <input type="radio" name="roleRadio" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="h-3.5 w-3.5" />
                    {r.label}
                  </span>
                  <span className="pl-5 text-xs text-[var(--color-ink-subtle)]">{r.description}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <SubmitButton text="Send invite" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateLookupItemDialog({ kind, label: dialogLabel }: { kind: LookupKind; label: string }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await createLookupItemAction(kind, formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="h-3.5 w-3.5" /> Add {dialogLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {dialogLabel}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input name="name" placeholder="e.g. Private Equity" required autoFocus />
          <DialogFooter>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateTagDialog() {
  const [open, setOpen] = useState(false);
  async function handleSubmit(formData: FormData) {
    await createTagAction(formData);
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="h-3.5 w-3.5" /> Add tag
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add tag</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input name="name" placeholder="e.g. Urgent" required />
          <Select name="colorToken" defaultValue="neutral">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["neutral", "success", "warning", "danger", "info", "accent"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="submit">Add tag</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const CUSTOM_FIELD_TYPES = ["TEXT", "LONG_TEXT", "NUMBER", "CURRENCY", "DATE", "BOOLEAN", "SINGLE_SELECT", "MULTI_SELECT", "URL"];
const CUSTOM_FIELD_ENTITIES = ["ORGANIZATION", "PERSON", "CANDIDATE_PROFILE", "OPPORTUNITY", "MANDATE"];

export function CreateCustomFieldDialog() {
  const [open, setOpen] = useState(false);
  async function handleSubmit(formData: FormData) {
    await createCustomFieldAction(formData);
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="h-3.5 w-3.5" /> Add custom field
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add custom field</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input name="label" placeholder="e.g. LinkedIn URL" required />
          <div className="grid grid-cols-2 gap-4">
            <Select name="entityType" defaultValue="ORGANIZATION">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_FIELD_ENTITIES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {label(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="fieldType" defaultValue="TEXT">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {label(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Add field</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
