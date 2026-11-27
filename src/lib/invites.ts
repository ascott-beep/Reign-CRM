import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Round 4 screens 46/47 need the real inviting admin's name ("Adam Whitfield
 * invited you as a Consultant" / "Ask Adam Whitfield for a new invite").
 * There's no invitedById column on User, but inviteUserAction already writes
 * a CREATE audit entry with the inviting admin as actor, so that's the
 * source of truth instead of a new schema field.
 */
export async function getInviter(userId: string) {
  const entry = await prisma.auditLog.findFirst({
    where: { entityType: "User", entityId: userId, action: "CREATE" },
    orderBy: { timestamp: "asc" },
    include: { actor: true },
  });
  return entry?.actor ?? null;
}
