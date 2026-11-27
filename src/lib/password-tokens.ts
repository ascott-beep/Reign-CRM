import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Creates a one-time token, stores only its hash, and returns the raw value to put in the email link. */
export async function createPasswordToken(userId: string, purpose: "INVITE" | "RESET") {
  const raw = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (purpose === "INVITE" ? INVITE_TTL_MS : RESET_TTL_MS));
  await prisma.passwordToken.create({ data: { userId, purpose, tokenHash: hashToken(raw), expiresAt } });
  return raw;
}

/** Looks up a raw token from a link, checking purpose, expiry and single-use. Does not mark it used. */
export async function findValidPasswordToken(raw: string, purpose: "INVITE" | "RESET") {
  const token = await prisma.passwordToken.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
  if (!token || token.purpose !== purpose || token.usedAt || token.expiresAt < new Date()) return null;
  return token;
}

/**
 * Round 4 screen 47 (R4AuthExpired) — looks up a token regardless of whether
 * it's expired or already used, so the expired-link page can still say who
 * it was for and offer the right follow-up action. Returns null only if the
 * raw value doesn't match any token this app ever issued.
 */
export async function findPasswordTokenRecord(raw: string) {
  return prisma.passwordToken.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
}

export async function consumePasswordToken(tokenId: string) {
  await prisma.passwordToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } });
}

/** Round 4 screen 44 (R4AuthSent) "Resend is limited to once a minute" — no new column needed, the most recent token's own createdAt is the record of when one was last sent. */
export async function secondsSinceLastRequest(userId: string, purpose: "INVITE" | "RESET"): Promise<number | null> {
  const latest = await prisma.passwordToken.findFirst({ where: { userId, purpose }, orderBy: { createdAt: "desc" } });
  if (!latest) return null;
  return (Date.now() - latest.createdAt.getTime()) / 1000;
}
