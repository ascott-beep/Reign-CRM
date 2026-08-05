import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, no optimization needed */}
            <img src="/brand/mark.svg" alt="" className="h-9 w-9" />
            <span className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Reign</span>
          </div>
          <p className="text-sm text-[var(--color-ink-subtle)]">Sign in to the Reign Partners recruitment CRM</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-[var(--color-ink-subtle)]">
          Internal workspace. Contact your administrator for access.
        </p>
      </div>
    </div>
  );
}
