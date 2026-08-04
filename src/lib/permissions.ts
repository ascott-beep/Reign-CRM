import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export * from "@/lib/permission-rules";
import type { SessionUser } from "@/lib/permission-rules";

/** Fetch the current session or redirect to /login. Use in server components / actions. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}

/** Fetch the current session without redirecting (for optional-auth contexts). */
export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser | undefined) ?? null;
}

/**
 * Highly confidential mandates are visible only to administrators and users
 * explicitly assigned to the mandate (owner or additional assigned users).
 */
export async function canViewMandate(user: SessionUser, mandateId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const mandate = await prisma.mandate.findUnique({
    where: { id: mandateId },
    select: {
      confidentiality: true,
      ownerId: true,
      assignedUsers: { select: { userId: true } },
    },
  });
  if (!mandate) return false;
  if (mandate.confidentiality !== "HIGHLY_CONFIDENTIAL") return true;
  if (mandate.ownerId === user.id) return true;
  return mandate.assignedUsers.some((a) => a.userId === user.id);
}
