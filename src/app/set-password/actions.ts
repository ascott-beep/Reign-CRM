"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { findValidPasswordToken, consumePasswordToken } from "@/lib/password-tokens";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type SetPasswordState = { error?: string };

const schema = z
  .object({
    token: z.string().min(1),
    purpose: z.enum(["invite", "reset"]),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match.", path: ["confirmPassword"] });

export async function setPasswordAction(_prev: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    purpose: formData.get("purpose"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Something went wrong." };

  const { token, purpose, password } = parsed.data;
  const record = await findValidPasswordToken(token, purpose === "invite" ? "INVITE" : "RESET");
  if (!record) return { error: "This link is invalid or has expired. Ask an administrator to send a new one." };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  await consumePasswordToken(record.id);

  try {
    await signIn("credentials", { email: record.user.email, password, redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return {};
    throw error;
  }
}
