"use client";

import { useState, useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { OAuthButtonGroup } from "@/components/brand/oauth-button";
import { cn } from "@/lib/utils";
import { setPasswordAction, type SetPasswordState } from "./actions";

const initialState: SetPasswordState = {};

const COMMON_PASSWORDS_HINT = /^(password|password1|password123|12345678|123456789|1234567890|qwerty123|qwertyuiop|letmein123|welcome123|admin1234|iloveyou1|sunshine1|princess1|football1|baseball1|dragon123|monkey123|trustno1|superman1|123123123|abc123456|changeme123|p@ssword1|passw0rd1)$/i;

function RuleRow({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-2 text-[13px]", met ? "text-[var(--color-pos)]" : "text-[var(--color-ink-subtle)]")}>
      {met ? (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-pos)] text-white">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      ) : (
        <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--color-border-strong)]" />
      )}
      {children}
    </div>
  );
}

/** Round 4 screen 45 (R4AuthNewPw) — the reset-password view: rules tick green live, Save enables once all three are met. */
function ChooseNewPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(setPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const longEnough = password.length >= 10;
  const notCommon = password.length > 0 && !COMMON_PASSWORDS_HINT.test(password);
  const matches = password.length > 0 && password === confirm;
  const allMet = longEnough && notCommon && matches;

  return (
    <div className="flex w-[400px] flex-col gap-4 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
      <div>
        <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">Choose a new password</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">For {email}</p>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="purpose" value="reset" />
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <RuleRow met={longEnough}>At least 10 characters</RuleRow>
          <RuleRow met={notCommon}>Not a common password</RuleRow>
          <RuleRow met={matches}>Matches below</RuleRow>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {state.error ? (
          <p className="rounded-md bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-ink)]">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending || !allMet} className="mt-1 h-[46px]">
          {pending ? "Saving…" : "Save and sign in"}
        </Button>
      </form>
    </div>
  );
}

/** Round 4 screen 46 (R4AuthInvite) — Google/Microsoft sit above the form here (no password set yet); email is fixed to the invite. */
function AcceptInviteForm({
  token,
  firstName,
  lastName,
  email,
  workspaceName,
  inviterName,
  roleLabel,
  providers,
}: {
  token: string;
  firstName: string;
  lastName: string;
  email: string;
  workspaceName: string;
  inviterName: string | null;
  roleLabel: string;
  providers: { google: boolean; microsoft: boolean };
}) {
  const [state, formAction, pending] = useActionState(setPasswordAction, initialState);
  const showOAuth = providers.google || providers.microsoft;

  return (
    <div className="flex w-[400px] flex-col gap-4 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
      <div>
        <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">Join {workspaceName} on Atlas</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {inviterName ? `${inviterName} invited you as a ${roleLabel}.` : `You were invited as a ${roleLabel}.`}
        </p>
      </div>
      <OAuthButtonGroup providers={providers} />
      {showOAuth ? (
        <div className="flex items-center gap-3.5 text-[12.5px] text-[var(--color-ink-subtle)]">
          <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
          or set a password
          <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
        </div>
      ) : null}
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="purpose" value="invite" />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" defaultValue={firstName} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" defaultValue={lastName} required />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled className="bg-[var(--color-sunk)] text-[var(--color-ink-subtle)]" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={10} />
          <input type="hidden" name="confirmPassword" value="" />
        </div>
        {state.error ? (
          <p className="rounded-md bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-ink)]">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-1 h-[46px]">
          {pending ? "Joining…" : "Join Atlas"}
        </Button>
      </form>
    </div>
  );
}

type SetPasswordFormProps =
  | { purpose: "reset"; token: string; firstName: string; email: string }
  | {
      purpose: "invite";
      token: string;
      firstName: string;
      lastName: string;
      email: string;
      workspaceName: string;
      inviterName: string | null;
      roleLabel: string;
      providers: { google: boolean; microsoft: boolean };
    };

export function SetPasswordForm(props: SetPasswordFormProps) {
  if (props.purpose === "invite") {
    return (
      <AcceptInviteForm
        token={props.token}
        firstName={props.firstName}
        lastName={props.lastName}
        email={props.email}
        workspaceName={props.workspaceName}
        inviterName={props.inviterName}
        roleLabel={props.roleLabel}
        providers={props.providers}
      />
    );
  }
  return <ChooseNewPasswordForm token={props.token} email={props.email} />;
}
