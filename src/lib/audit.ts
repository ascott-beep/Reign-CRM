import "server-only";
import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@prisma/client";
import { label } from "@/lib/labels";

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

function humanizeFieldName(field: string): string {
  const words = field.replace(/([A-Z])/g, " $1").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "blank";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (field.toLowerCase().includes("percentage")) return `${value}%`;
  const asString = String(value);
  // Enum-shaped values (all caps, underscores) read as plain English via label(); anything else (names, numbers, free text) is shown as-is.
  if (/^[A-Z][A-Z0-9_]*$/.test(asString)) return label(asString);
  return asString;
}

/**
 * Round 4 screen 17 (R4MandateAudit): "Plain-English sentences, newest first...
 * Never raw field names." Turns a stored audit row into one sentence; used by
 * both the mandate and opportunity Audit tabs.
 */
export function describeAuditLog(log: { action: AuditAction; changedFields: unknown }): string {
  const cf = (log.changedFields ?? null) as Record<string, unknown> | null;

  if (log.action === "CREATE") return "Created";
  if (log.action === "DELETE") return "Deleted";
  if (log.action === "ARCHIVE") return "Archived";
  if (log.action === "RESTORE") return "Restored";
  if (log.action === "CONVERSION") return "Converted to a mandate";
  if (log.action === "EXPORT") return "Data exported";
  if (log.action === "PRIVACY_ACTION") return "Privacy action taken";
  if (log.action === "OFF_LIMITS_OVERRIDE") return "Off-limits restriction overridden";

  if (log.action === "STAGE_CHANGE") {
    const from = (cf?.fromStage ?? cf?.fromStatus) as string | null | undefined;
    const to = (cf?.toStage ?? cf?.toStatus) as string | null | undefined;
    if (to) return from ? `Stage changed from ${label(from)} to ${label(to)}` : `Stage set to ${label(to)}`;
    return "Stage changed";
  }

  if (log.action === "UPDATE") {
    if (!cf || Object.keys(cf).length === 0) return "Updated";
    const sentences = Object.entries(cf)
      .filter(([, change]) => change && typeof change === "object")
      .map(([field, change]) => {
        const { before, after } = change as { before: unknown; after: unknown };
        return `${humanizeFieldName(field)} changed from ${formatAuditValue(field, before)} to ${formatAuditValue(field, after)}`;
      });
    return sentences.length > 0 ? sentences.join("; ") : "Updated";
  }

  return label(log.action);
}
