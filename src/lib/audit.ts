import "server-only";
import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

export async function writeAuditLog(params: {
  workspaceId: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changedFields?: Record<string, unknown> | null;
  requestMetadata?: Record<string, unknown> | null;
}) {
  await prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changedFields: (params.changedFields ?? undefined) as Prisma.InputJsonValue | undefined,
      requestMetadata: (params.requestMetadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/** Shallow diff of two plain-object records, for audit `changedFields`. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(after)) {
    const b = before[key];
    const a = after[key];
    const bComparable = b instanceof Date ? b.toISOString() : b;
    const aComparable = a instanceof Date ? a.toISOString() : a;
    if (JSON.stringify(bComparable) !== JSON.stringify(aComparable)) {
      changed[key] = { before: b ?? null, after: a ?? null };
    }
  }
  return changed;
}
