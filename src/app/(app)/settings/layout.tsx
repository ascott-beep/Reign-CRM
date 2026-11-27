import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { PermissionDeniedState } from "@/components/shell/states";
import { SettingsNav } from "./settings-nav";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return <PermissionDeniedState description="Settings are administrator-only. You can still manage your own profile." />;
  }

  return (
    <div>
      <PageHeader title="Settings" description="Workspace-wide configuration. Administrator only." />
      <div className="flex gap-8">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
