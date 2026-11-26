import { cookies } from "next/headers";
import { GlobalSearch } from "@/components/shell/global-search";
import { QuickCreate } from "@/components/shell/quick-create";
import { TaskIndicator } from "@/components/shell/task-indicator";
import { DeskPicker } from "@/components/shell/desk-picker";
import { DESK_COOKIE } from "@/lib/desk-cookie";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";

export async function Header({ user }: { user: SessionUser }) {
  const [cookieStore, consultants] = await Promise.all([
    cookies(),
    prisma.user.findMany({
      where: { workspaceId: user.workspaceId, active: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);
  const deskOptions = consultants.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }));

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b border-[var(--color-line)] bg-[var(--color-side)] px-4">
      <DeskPicker options={deskOptions} initialValue={cookieStore.get(DESK_COOKIE)?.value ?? ""} />
      <GlobalSearch />
      <TaskIndicator user={user} />
      <QuickCreate />
    </header>
  );
}
