import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { InviteUserDialog } from "../settings-dialogs";
import { UserRowControls } from "../user-row-controls";

export default async function SettingsUsersPage() {
  const user = await requireUser();
  const users = await prisma.user.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { firstName: "asc" } });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <InviteUserDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role / Status</TableHead>
            <TableHead>Last login</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.firstName} {u.lastName}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <UserRowControls userId={u.id} role={u.role} active={u.active} isSelf={u.id === user.id} hasPassword={Boolean(u.passwordHash)} />
              </TableCell>
              <TableCell>{u.lastLoginAt ? format(u.lastLoginAt, "d MMM yyyy HH:mm") : "Never"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
