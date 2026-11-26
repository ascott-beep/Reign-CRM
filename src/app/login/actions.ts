"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }
      return { error: "Sign in failed. Please try again." };
    }
    // NEXT_REDIRECT is thrown by signIn() on success — rethrow so Next can handle it.
    throw error;
  }
}

export async function signInWithProviderAction(provider: "google" | "microsoft-entra-id") {
  await signIn(provider, { redirectTo: "/dashboard" });
}
