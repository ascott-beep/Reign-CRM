"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { findValidPasswordToken, findPasswordTokenRecord, consumePasswordToken } from "@/lib/password-tokens";
import { isCommonPassword } from "@/lib/common-passwords";
import { getInviter } from "@/lib/invites";
import { sendNewInviteRequestEmail } from "@/lib/email";
import { baseUrl } from "@/lib/base-url";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type SetPasswordState = { error?: string };

/** Round 4 screen 45 (R4AuthNewPw): "At least 10 characters" / "Not a common password" / "Matches below", ticked green live client-side as each is met. */
const passwordRule = z
  .string()
  .min(10, "Use at least 10 characters.")
  .refine((v) => !isCommonPassword(v), { message: "Choose a less common password." });

const schema = z
  .object({
    token: z.string().min(1),
    purpose: z.enum(["invite", "reset"]),
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    password: passwordRule,
    // The reset view (screen 45) has a visible "Confirm new password" field;
    // the invite view (screen 46) has a single password field and sends this
    // empty, so the match check below only applies to the reset purpose.
    confirmPassword: z.string(),
  })
  .refine((d) => d.purpose === "invite" || d.password === d.confirmPassword, { message: "Passwords don't match.", path: ["confirmPassword"] });

export async function setPasswordAction(_prev: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    purpose: formData.get("purpose"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Something went wrong." };

  const { token, purpose, password, firstName, lastName } = parsed.data;
  const record = await findValidPasswordToken(token, purpose === "invite" ? "INVITE" : "RESET");
  if (!record) return { error: "This link is invalid or has expired. Ask an administrator to send a new one." };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: record.userId },
    data: {
      passwordHash,
      ...(purpose === "invite" && firstName ? { firstName } : {}),
      ...(purpose === "invite" && lastName ? { lastName } : {}),
    },
  });
  await consumePasswordToken(record.id);

  try {
    await signIn("credentials", { email: record.user.email, password, redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return {};
    throw error;
  }
}

/**
 * Round 4 screen 47 (R4AuthExpired), invite variant: "Ask <admin> for a new
 * invite" — emails whoever actually sent the original invite (read from the
 * CREATE audit entry, see src/lib/invites.ts) rather than resending it
 * here directly, since only an admin's own "Resend invite" action in
 * Settings > Users is allowed to issue a fresh token.
 */
export async function requestNewInviteAction(expiredToken: string): Promise<{ sent: boolean }> {
  const record = await findPasswordTokenRecord(expiredToken);
  if (!record || record.purpose !== "INVITE") return { sent: false };

  const inviter = await getInviter(record.userId);
  if (!inviter) return { sent: false };

  await sendNewInviteRequestEmail({
    to: inviter.email,
    adminFirstName: inviter.firstName,
    requesterName: `${record.user.firstName} ${record.user.lastName}`,
    url: `${baseUrl()}/settings/users`,
  });
  return { sent: true };
}
