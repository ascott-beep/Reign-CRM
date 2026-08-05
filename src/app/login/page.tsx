import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getBrandLogoPath } from "@/lib/brand-logo";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const logoPath = getBrandLogoPath();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          {logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- static brand asset, no optimization needed
            <img src={logoPath} alt="Reign" className="h-10" />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, no optimization needed */}
              <img src="/brand/mark.svg" alt="" className="h-9 w-9" />
              <span className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Reign Partners</span>
            </>
          )}
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-[var(--color-ink-subtle)]">
          Internal workspace. Contact your administrator for access.
        </p>
      </div>
    </div>
  );
}
