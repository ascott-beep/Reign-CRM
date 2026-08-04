import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { requireUser } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-canvas)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
