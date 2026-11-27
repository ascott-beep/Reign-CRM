import { cookies } from "next/headers";
import { GlobalSearch } from "@/components/shell/global-search";
import { QuickCreate } from "@/components/shell/quick-create";
import { TaskIndicator } from "@/components/shell/task-indicator";
import { DeskPicker } from "@/components/shell/desk-picker";
import { DESK_COOKIE } from "@/lib/desk-cookie";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";

/**
 * Round 2 section 1: the desk picker, search, notifications and Quick
 * create used to live in a separate top bar (components/shell/header.tsx).
 * That bar is gone — every page now carries this same cluster inline in
 * its own header row instead, vertically centred with the page title, as
 * in 01-overview.
 */
export async function GlobalHeaderControls({
  user,
  showDeskPicker = true,
}: {
  user: SessionUser;
  /** Reports already has its own desk picker wired to its own filtering — skip the duplicate there. */
  showDeskPicker?: boolean;
}) {
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
    <div className="flex items-center gap-2">
      {showDeskPicker ? <DeskPicker options={deskOptions} initialValue={cookieStore.get(DESK_COOKIE)?.value ?? ""} /> : null}
      <GlobalSearch />
      <TaskIndicator user={user} />
      <QuickCreate />
    </div>
  );
}
