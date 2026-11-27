import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { configuredOAuthProviders } from "@/lib/oauth-providers";
import { AuthShell } from "@/components/brand/auth-shell";
import { findValidPasswordToken, findPasswordTokenRecord } from "@/lib/password-tokens";
import { getInviter } from "@/lib/invites";
import { ROLE_SHORT_LABEL } from "@/lib/labels";
import { SetPasswordForm } from "./set-password-form";
import { ExpiredLink } from "./expired-link";

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

  if (record && token) {
    if (purpose === "invite") {
      const [workspace, inviter, providers] = await Promise.all([
        prisma.workspace.findUniqueOrThrow({ where: { id: record.user.workspaceId }, select: { name: true } }),
        getInviter(record.userId),
        Promise.resolve(configuredOAuthProviders()),
      ]);
      return (
        <AuthShell>
          <SetPasswordForm
            token={token}
            purpose="invite"
            firstName={record.user.firstName}
            lastName={record.user.lastName}
            email={record.user.email}
            workspaceName={workspace.name}
            inviterName={inviter ? `${inviter.firstName} ${inviter.lastName}` : null}
            roleLabel={ROLE_SHORT_LABEL[record.user.role] ?? record.user.role}
            providers={providers}
          />
        </AuthShell>
      );
    }
    return (
      <AuthShell>
        <SetPasswordForm token={token} purpose="reset" firstName={record.user.firstName} email={record.user.email} />
      </AuthShell>
    );
  }

  // Round 4 screen 47 (R4AuthExpired). Look up the token regardless of
  // validity so an expired invite can still name who sent it and offer to
  // email them, while a bare/garbled token falls back to the generic copy.
  const expiredRecord = token ? await findPasswordTokenRecord(token) : null;
  const inviter = expiredRecord && expiredRecord.purpose === "INVITE" ? await getInviter(expiredRecord.userId) : null;

  return (
    <AuthShell>
      <ExpiredLink token={token} inviterName={inviter ? `${inviter.firstName} ${inviter.lastName}` : null} />
    </AuthShell>
  );
}
