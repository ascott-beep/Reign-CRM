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
import { createUserAction, createLookupItemAction, createTagAction, createCustomFieldAction, type SettingsFormState, type LookupKind } from "./actions";

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : text}
    </Button>
  );
}

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<SettingsFormState, FormData>(createUserAction, {});
  const errors = state.errors ?? {};

  if (state.success && open) setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            {errors.email ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.email[0]}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
            {errors.password ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.password[0]}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue="STANDARD">
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{label("ADMIN")}</SelectItem>
                <SelectItem value="STANDARD">{label("STANDARD")}</SelectItem>
                <SelectItem value="READ_ONLY">{label("READ_ONLY")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <SubmitButton text="Add user" />
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
          <Input name="name" placeholder="Name" required autoFocus />
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
          <Input name="name" placeholder="Tag name" required />
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
          <Input name="label" placeholder="Field label" required />
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
