"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import type { MailProvider } from "@prisma/client";

/** Round 2 section 7 — each user manages their own mailbox/calendar connection here; nothing here is admin-only. */
export async function disconnectMailboxAction(provider: MailProvider) {
  const user = await requireUser();
  const existing = await prisma.mailboxConnection.findUnique({ where: { userId_provider: { userId: user.id, provider } } });
  if (!existing) return;

  await prisma.mailboxConnection.delete({ where: { id: existing.id } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "MailboxConnection", entityId: existing.id, action: "DELETE", changedFields: { provider } });
  revalidatePath("/settings/connections");
}

export async function toggleMailboxSyncAction(provider: MailProvider, kind: "email" | "calendar", enabled: boolean) {
  const user = await requireUser();
  const existing = await prisma.mailboxConnection.findUnique({ where: { userId_provider: { userId: user.id, provider } } });
  if (!existing) return;

  await prisma.mailboxConnection.update({
    where: { id: existing.id },
    data: kind === "email" ? { emailSyncEnabled: enabled } : { calendarSyncEnabled: enabled },
  });
  revalidatePath("/settings/connections");
}

export async function addNeverSyncAddressAction(formData: FormData) {
  const user = await requireUser();
  const emailAddress = String(formData.get("emailAddress") ?? "").trim().toLowerCase();
  if (!emailAddress || !emailAddress.includes("@")) throw new Error("Enter a valid email address.");

  await prisma.neverSyncAddress.upsert({
    where: { userId_emailAddress: { userId: user.id, emailAddress } },
    create: { userId: user.id, emailAddress },
    update: {},
  });
  revalidatePath("/settings/connections");
}

export async function removeNeverSyncAddressAction(id: string) {
  const user = await requireUser();
  await prisma.neverSyncAddress.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/settings/connections");
}
