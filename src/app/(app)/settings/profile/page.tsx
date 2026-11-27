import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { updateProfileAction } from "../actions";
import { ChangePasswordDialog } from "./change-password-dialog";

/** Round 4 screen 32 (R4SetProfile). One "My profile" section heading; "Settings" lives on the layout above. */
export default async function ProfilePage() {
  const user = await requireUser();
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  return (
    <div className="max-w-xl">
      <h2 className="m-0 text-lg font-medium text-[var(--color-ink)]">My profile</h2>
      <p className="mt-1 mb-6 text-sm text-[var(--color-ink-subtle)]">How you appear to the team and how you sign in.</p>

      <Card className="mb-5">
        <CardContent className="pt-4">
          <h3 className="mb-4 text-sm font-semibold">Your details</h3>
          <form action={updateProfileAction} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-[13px] font-semibold text-[var(--color-navy-ink)]">
                {initials(record.firstName, record.lastName)}
              </span>
              <p className="text-xs text-[var(--color-ink-subtle)]">Photo upload isn&apos;t set up yet. Your initials show instead.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" defaultValue={record.firstName} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" defaultValue={record.lastName} required />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={record.email} disabled />
              <p className="text-xs text-[var(--color-ink-subtle)]">Your sign-in. Ask an admin to change it.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timezone">Time zone</Label>
              <Select defaultValue="Europe/London" disabled>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/London">London (UK time)</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="timezone" value="Europe/London" />
              <p className="text-xs text-[var(--color-ink-subtle)]">Atlas runs on UK time everywhere, so every date and time in the app lines up.</p>
            </div>

            <div>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-4 text-sm font-semibold">Password</h3>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--color-ink)]">Password</p>
              <p className="text-xs text-[var(--color-ink-subtle)]">
                Last changed {formatDistanceToNowStrict(record.updatedAt, { addSuffix: true })}
              </p>
            </div>
            <ChangePasswordDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
