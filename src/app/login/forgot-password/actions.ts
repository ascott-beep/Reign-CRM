"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPasswordToken } from "@/lib/password-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { baseUrl } from "@/lib/base-url";

export type ForgotPasswordState = { sent?: boolean; error?: string };

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

/** Section 9.2 "Forgot password?" — always reports success so the response can't be used to enumerate accounts. */
export async function requestPasswordResetAction(_prev: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email, active: true } });
  if (user) {
    const token = await createPasswordToken(user.id, "RESET");
    const url = `${baseUrl()}/set-password?token=${token}&purpose=reset`;
    await sendPasswordResetEmail({ to: user.email, firstName: user.firstName, url });
  }

  return { sent: true };
}
