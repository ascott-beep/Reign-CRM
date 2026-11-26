import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/brand/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
