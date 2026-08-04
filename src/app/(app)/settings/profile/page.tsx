import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction, changePasswordAction } from "../actions";

export default async function ProfilePage() {
  const user = await requireUser();
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  return (
    <div className="max-w-xl">
      <PageHeader title="My profile" description="Update your personal details, timezone and password." />

      <Card className="mb-6">
        <CardContent className="pt-4">
          <h3 className="mb-3 text-sm font-semibold">Profile</h3>
          <form action={updateProfileAction} className="flex flex-col gap-4">
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
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" defaultValue={record.timezone} placeholder="Europe/London" />
            </div>
            <div>
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-3 text-sm font-semibold">Change password</h3>
          <form action={changePasswordAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
            </div>
            <div>
              <Button type="submit">Change password</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
