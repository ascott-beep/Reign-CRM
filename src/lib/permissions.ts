import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: UserRole;
  workspaceId: string;
  firstName: string;
  lastName: string;
  email: string;
};

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

export class PermissionError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionError";
  }
}

export function canMutate(role: UserRole) {
  return role === "ADMIN" || role === "STANDARD";
}

export function canManageSettings(role: UserRole) {
  return role === "ADMIN";
}

export function canMergeRecords(role: UserRole) {
  return role === "ADMIN";
}

export function canViewAuditLog(role: UserRole) {
  return role === "ADMIN";
}

export function canExport(role: UserRole) {
  return role === "ADMIN" || role === "STANDARD";
}

export function canUploadDocuments(role: UserRole) {
  return role === "ADMIN" || role === "STANDARD";
}

export function canRestoreArchived(role: UserRole) {
  return role === "ADMIN";
}

export function canRunPrivacyExport(role: UserRole) {
  return role === "ADMIN";
}

export function canOverrideOffLimits(role: UserRole) {
  return role === "ADMIN";
}

/** Standard users may only archive records they own or created; admins can archive anything. */
export function canArchiveRecord(
  user: SessionUser,
  record: { ownerId?: string | null; relationshipOwnerId?: string | null; createdById?: string | null },
) {
  if (user.role === "ADMIN") return true;
  if (user.role === "READ_ONLY") return false;
  const ownerId = record.ownerId ?? record.relationshipOwnerId ?? null;
  return ownerId === user.id || record.createdById === user.id;
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

/** Prisma `where` fragment that hides highly-confidential mandates the user isn't assigned to. */
export function mandateVisibilityWhere(user: SessionUser) {
  if (user.role === "ADMIN") return {};
  return {
    OR: [
      { confidentiality: { not: "HIGHLY_CONFIDENTIAL" as const } },
      { ownerId: user.id },
      { assignedUsers: { some: { userId: user.id } } },
    ],
  };
}

export function requireMutate(role: UserRole) {
  if (!canMutate(role)) throw new PermissionError("Read-only users cannot make changes.");
}

export function requireAdmin(role: UserRole) {
  if (role !== "ADMIN") throw new PermissionError("This action requires administrator access.");
}
