import type { UserRole } from "@prisma/client";

/**
 * Pure, framework-free role/ownership rules — split out from permissions.ts
 * so they can be unit-tested directly without pulling in Next.js/Auth.js
 * (which only resolve inside Next's own bundler).
 */

export type SessionUser = {
  id: string;
  role: UserRole;
  workspaceId: string;
  firstName: string;
  lastName: string;
  email: string;
};

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
