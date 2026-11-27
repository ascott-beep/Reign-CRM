import { cookies } from "next/headers";
import { DeskPicker } from "@/components/shell/desk-picker";
import { DESK_COOKIE } from "@/lib/desk-cookie";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";

/**
 * Round 3 item 7: search, notifications and + New moved to the sidebar —
 * this is the desk picker only now, kept next to a page's own actions on
 * the five pages it actually filters (Overview, Opportunities, Mandates,
 * Tasks, Reports). Pass `user` on PageHeader to show it; omit it on every
 * other page.
 */
export async function GlobalHeaderControls({ user, showDeskPicker = true }: { user: SessionUser; showDeskPicker?: boolean }) {
  if (!showDeskPicker) return null;

  const [cookieStore, consultants] = await Promise.all([
    cookies(),
    prisma.user.findMany({
      where: { workspaceId: user.workspaceId, active: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);
  const deskOptions = consultants.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }));

  return <DeskPicker options={deskOptions} initialValue={cookieStore.get(DESK_COOKIE)?.value ?? ""} />;
}
