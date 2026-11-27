"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPasswordToken, secondsSinceLastRequest } from "@/lib/password-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { baseUrl } from "@/lib/base-url";

export type ForgotPasswordState = { sent?: boolean; error?: string; email?: string };

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

const RESEND_COOLDOWN_SECONDS = 60;

/** Section 9.2 "Forgot password?" — always reports success so the response can't be used to enumerate accounts. */
export async function requestPasswordResetAction(_prev: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email, active: true } });
  if (user) {
    // Round 4 screen 44 (R4AuthSent) "Resend is limited to once a minute" —
    // enforced here too (not just client-side) so repeated submits of this
    // same form can't spam the inbox either.
    const elapsed = await secondsSinceLastRequest(user.id, "RESET");
    if (elapsed === null || elapsed >= RESEND_COOLDOWN_SECONDS) {
      const token = await createPasswordToken(user.id, "RESET");
      const url = `${baseUrl()}/set-password?token=${token}&purpose=reset`;
      await sendPasswordResetEmail({ to: user.email, firstName: user.firstName, url });
    }
  }

  return { sent: true, email: parsed.data.email };
}
