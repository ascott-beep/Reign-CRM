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
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-accent-ink)]">
            RP
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">Reign Partners</h1>
          <p className="text-sm text-[var(--color-ink-subtle)]">Sign in to the recruitment CRM</p>
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
