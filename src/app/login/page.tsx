import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { configuredOAuthProviders } from "@/lib/oauth-providers";
import { AuthShell } from "@/components/brand/auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { error } = await searchParams;
  const providers = configuredOAuthProviders();

  return (
    <AuthShell>
      <LoginForm providers={providers} error={error} />
    </AuthShell>
  );
}
