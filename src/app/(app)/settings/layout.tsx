import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { SettingsNav } from "./settings-nav";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

/**
 * Most of Settings is administrator-only, but "My profile" and
 * "Connections" (every user connects their own mailbox/calendar there)
 * are for everyone — so the role gate lives on each admin-only page
 * instead of here. SettingsNav itself hides the admin-only items from
 * non-admins.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="flex gap-8">
        <SettingsNav isAdmin={user.role === "ADMIN"} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
