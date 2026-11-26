"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import type { DeletableType } from "@/lib/delete";

const MODEL = {
  ORGANIZATION: prisma.organization,
  PERSON: prisma.person,
  MANDATE: prisma.mandate,
  OPPORTUNITY: prisma.opportunity,
} as const;

const ENTITY_TYPE: Record<DeletableType, string> = {
  ORGANIZATION: "Organization",
  PERSON: "Person",
  MANDATE: "Mandate",
  OPPORTUNITY: "Opportunity",
};

const LIST_PATH: Record<DeletableType, string> = {
  ORGANIZATION: "/organisations",
  PERSON: "/people",
  MANDATE: "/mandates",
  OPPORTUNITY: "/opportunities",
};

/** Section 9.3 "Delete" — soft delete (archive) with an optional reason, admin-only. */
export async function deleteRecordAction(type: DeletableType, id: string, reason?: string) {
  const user = await requireUser();
  requireAdmin(user.role);

  const model = MODEL[type] as any;
  await model.findFirstOrThrow({ where: { id, workspaceId: user.workspaceId } });
  await model.update({ where: { id }, data: { archivedAt: new Date(), archivedById: user.id, archiveReason: reason || null } });
  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: ENTITY_TYPE[type],
    entityId: id,
    action: "ARCHIVE",
    changedFields: reason ? { archiveReason: reason } : undefined,
  });

  revalidatePath(LIST_PATH[type]);
  revalidatePath(`${LIST_PATH[type]}/${id}`);
  revalidatePath("/settings/recently-deleted");
}

export async function restoreRecordAction(type: DeletableType, id: string) {
  const user = await requireUser();
  requireAdmin(user.role);

  const model = MODEL[type] as any;
  await model.findFirstOrThrow({ where: { id, workspaceId: user.workspaceId } });
  await model.update({ where: { id }, data: { archivedAt: null, archivedById: null, archiveReason: null } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: ENTITY_TYPE[type], entityId: id, action: "RESTORE" });

  revalidatePath(LIST_PATH[type]);
  revalidatePath(`${LIST_PATH[type]}/${id}`);
  revalidatePath("/settings/recently-deleted");
}
