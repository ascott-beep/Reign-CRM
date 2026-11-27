import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/brand/auth-shell";
import { findValidPasswordToken } from "@/lib/password-tokens";
import { SetPasswordForm } from "./set-password-form";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; purpose?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { token, purpose: rawPurpose } = await searchParams;
  const purpose = rawPurpose === "invite" ? "invite" : "reset";
  const record = token ? await findValidPasswordToken(token, purpose === "invite" ? "INVITE" : "RESET") : null;

  return (
    <AuthShell>
      {record && token ? (
        <SetPasswordForm token={token} purpose={purpose} firstName={record.user.firstName} />
      ) : (
        <div className="flex w-[400px] flex-col gap-3 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-md)]">
          <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">This link is invalid or has expired</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Ask an administrator to send you a new {purpose === "invite" ? "invite" : "reset"} link.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
