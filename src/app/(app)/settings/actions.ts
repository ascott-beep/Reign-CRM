"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/permissions";
import { inviteUserSchema, workspaceSettingsSchema, currencySettingsSchema, staleThresholdsSchema, lookupItemSchema, aiResearchSettingsSchema } from "@/lib/validation/settings";
import { writeAuditLog } from "@/lib/audit";
import { CURRENCY_CODES } from "@/lib/currency";
import { createPasswordToken } from "@/lib/password-tokens";
import { sendInviteEmail, sendPasswordResetEmail } from "@/lib/email";
import { baseUrl } from "@/lib/base-url";

export type SettingsFormState = { errors?: Record<string, string[]>; success?: boolean };

/** Section 9.5 / d13 — invites a user by email instead of setting a temporary password. */
export async function inviteUserAction(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const user = await requireUser();
  requireAdmin(user.role);

  const raw = Object.fromEntries(formData.entries());
  const parsed = inviteUserSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  const data = parsed.data;

  const existing = await prisma.user.findFirst({ where: { workspaceId: user.workspaceId, email: data.email } });
  if (existing) return { errors: { email: ["A user with this email already exists."] } };

  const created = await prisma.user.create({
    data: { workspaceId: user.workspaceId, firstName: data.firstName, lastName: data.lastName, email: data.email, role: data.role },
  });

  const token = await createPasswordToken(created.id, "INVITE");
  await sendInviteEmail({ to: created.email, firstName: created.firstName, url: `${baseUrl()}/set-password?token=${token}&purpose=invite` });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "User", entityId: created.id, action: "CREATE" });
  revalidatePath("/settings/users");
  return { success: true };
}

/** Sends a fresh invite link, e.g. if the first one expired — row menu action in screen 12. */
export async function resendInviteAction(userId: string) {
  const user = await requireUser();
  requireAdmin(user.role);
  const target = await prisma.user.findFirstOrThrow({ where: { id: userId, workspaceId: user.workspaceId } });
  if (target.passwordHash) throw new Error("This user has already set a password.");

  const token = await createPasswordToken(target.id, "INVITE");
  await sendInviteEmail({ to: target.email, firstName: target.firstName, url: `${baseUrl()}/set-password?token=${token}&purpose=invite` });
  revalidatePath("/settings/users");
}

/** Cancels a pending invite by removing the never-activated user — row menu action in screen 12. */
export async function cancelInviteAction(userId: string) {
  const user = await requireUser();
  requireAdmin(user.role);
  const target = await prisma.user.findFirstOrThrow({ where: { id: userId, workspaceId: user.workspaceId } });
  if (target.passwordHash) throw new Error("This user has already set a password.");

  await prisma.user.delete({ where: { id: userId } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "User", entityId: userId, action: "DELETE" });
  revalidatePath("/settings/users");
}

/** Sends a password-reset link to an already-active user — row menu action in screen 12. */
export async function sendPasswordResetToUserAction(userId: string) {
  const user = await requireUser();
  requireAdmin(user.role);
  const target = await prisma.user.findFirstOrThrow({ where: { id: userId, workspaceId: user.workspaceId } });

  const token = await createPasswordToken(target.id, "RESET");
  await sendPasswordResetEmail({ to: target.email, firstName: target.firstName, url: `${baseUrl()}/set-password?token=${token}&purpose=reset` });
}

export async function setUserActiveAction(userId: string, active: boolean) {
  const user = await requireUser();
  requireAdmin(user.role);
  if (userId === user.id && !active) throw new Error("You cannot deactivate your own account.");
  await prisma.user.update({ where: { id: userId }, data: { active } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "User", entityId: userId, action: "UPDATE", changedFields: { active } });
  revalidatePath("/settings/users");
}

export async function setUserRoleAction(userId: string, role: string) {
  const user = await requireUser();
  requireAdmin(user.role);

  if (userId === user.id && role !== "ADMIN") {
    const otherAdmins = await prisma.user.count({ where: { workspaceId: user.workspaceId, role: "ADMIN", active: true, id: { not: user.id } } });
    if (otherAdmins === 0) throw new Error("You're the last admin, promote someone else first.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role: role as any } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "User", entityId: userId, action: "UPDATE", changedFields: { role } });
  revalidatePath("/settings/users");
}

/** Moves every open opportunity, mandate, task and candidate process owned by one user onto another — row menu action in screen 12. */
export async function reassignOpenWorkAction(userId: string, targetUserId: string) {
  const user = await requireUser();
  requireAdmin(user.role);
  if (userId === targetUserId) throw new Error("Pick a different person to reassign to.");

  const target = await prisma.user.findFirstOrThrow({ where: { id: targetUserId, workspaceId: user.workspaceId, active: true } });

  const [opportunities, mandates, tasks, candidateProcesses] = await prisma.$transaction([
    prisma.opportunity.updateMany({
      where: { workspaceId: user.workspaceId, ownerId: userId, archivedAt: null, stage: { notIn: ["WON", "LOST"] } },
      data: { ownerId: targetUserId },
    }),
    prisma.mandate.updateMany({
      where: { workspaceId: user.workspaceId, ownerId: userId, archivedAt: null, status: { notIn: ["FILLED", "CANCELLED"] } },
      data: { ownerId: targetUserId },
    }),
    prisma.task.updateMany({
      where: { workspaceId: user.workspaceId, assignedUserId: userId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS"] } },
      data: { assignedUserId: targetUserId },
    }),
    prisma.candidateProcess.updateMany({
      where: { workspaceId: user.workspaceId, ownerId: userId, stage: { notIn: ["PLACED", "REJECTED", "WITHDRAWN"] } },
      data: { ownerId: targetUserId },
    }),
  ]);

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "User",
    entityId: userId,
    action: "UPDATE",
    changedFields: {
      reassignedTo: target.id,
      opportunities: opportunities.count,
      mandates: mandates.count,
      tasks: tasks.count,
      candidateProcesses: candidateProcesses.count,
    },
  });

  revalidatePath("/settings/users");
  return { opportunities: opportunities.count, mandates: mandates.count, tasks: tasks.count, candidateProcesses: candidateProcesses.count };
}

export async function updateWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);

  const raw = Object.fromEntries(formData.entries());
  const parsed = workspaceSettingsSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  await prisma.workspace.update({ where: { id: user.workspaceId }, data });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Workspace", entityId: user.workspaceId, action: "UPDATE", changedFields: data });
  revalidatePath("/settings/workspace");
  revalidatePath("/");
}

/** Round 2 section 8 "Admins can switch Ask Atlas off in Settings." */
export async function updateAskAtlasEnabledAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);

  const askAtlasEnabled = formData.get("askAtlasEnabled") === "on";
  await prisma.workspace.update({ where: { id: user.workspaceId }, data: { askAtlasEnabled } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Workspace", entityId: user.workspaceId, action: "UPDATE", changedFields: { askAtlasEnabled } });
  revalidatePath("/settings/workspace");
}

/** Section 9.6 — "Show totals in" + the opt-in daily FX auto-update toggle. */
export async function updateCurrencySettingsAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);

  const raw = Object.fromEntries(formData.entries());
  const parsed = currencySettingsSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await prisma.workspace.update({
    where: { id: user.workspaceId },
    data: { defaultCurrency: parsed.data.defaultCurrency, updateRatesAutomatically: parsed.data.updateRatesAutomatically ?? false },
  });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Workspace", entityId: user.workspaceId, action: "UPDATE", changedFields: parsed.data });
  revalidatePath("/settings/currencies");
  revalidatePath("/settings/workspace");
  revalidatePath("/");
}

/** Round 2 section 6 — Settings -> Connections "AI research: Claude" card. */
export async function updateAiResearchSettingsAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);

  const raw = { ...Object.fromEntries(formData.entries()), signalTypes: formData.getAll("signalTypes") };
  const parsed = aiResearchSettingsSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await prisma.workspace.update({
    where: { id: user.workspaceId },
    data: {
      intelligenceSweepEnabled: parsed.data.sweepEnabled ?? false,
      intelligenceSweepHourUtc: parsed.data.sweepHourUtc,
      intelligenceSignalTypes: parsed.data.signalTypes,
    },
  });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Workspace", entityId: user.workspaceId, action: "UPDATE", changedFields: parsed.data });
  revalidatePath("/settings/connections");
}

export async function updateExchangeRatesAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);

  const rates: Record<string, number> = {};
  for (const code of CURRENCY_CODES) {
    const raw = formData.get(`rate_${code}`);
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${code} rate must be a positive number.`);
    rates[code] = value;
  }

  await prisma.workspace.update({ where: { id: user.workspaceId }, data: { exchangeRatesToGbp: rates, exchangeRatesUpdatedAt: new Date() } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Workspace", entityId: user.workspaceId, action: "UPDATE", changedFields: { exchangeRatesToGbp: rates } });
  revalidatePath("/settings/currencies");
  revalidatePath("/reports");
}

export async function updateStaleThresholdsAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);

  const raw = Object.fromEntries(formData.entries());
  const parsed = staleThresholdsSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await prisma.workspace.update({ where: { id: user.workspaceId }, data: { staleThresholds: parsed.data } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Workspace", entityId: user.workspaceId, action: "UPDATE", changedFields: { staleThresholds: parsed.data } });
  revalidatePath("/settings/workspace");
}

export async function updateStageProbabilitiesAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);

  const stages = ["SIGNAL_IDENTIFIED", "CONTACT_IDENTIFIED", "CONTACTED", "DISCOVERY_ARRANGED", "QUALIFIED", "PROPOSAL_OR_TERMS"];
  const probabilities: Record<string, number> = {};
  for (const stage of stages) {
    const raw = formData.get(stage);
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0 && value <= 100) probabilities[stage] = value;
  }
  probabilities.WON = 100;
  probabilities.LOST = 0;

  await prisma.workspace.update({ where: { id: user.workspaceId }, data: { opportunityStageProbabilities: probabilities } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Workspace", entityId: user.workspaceId, action: "UPDATE", changedFields: { opportunityStageProbabilities: probabilities } });
  revalidatePath("/settings/pipeline-stages");
}

const LOOKUP_MODELS = {
  sector: prisma.sector,
  practiceArea: prisma.practiceArea,
  functionalSpecialism: prisma.functionalSpecialism,
  investorStrategy: prisma.investorStrategy,
  ownershipType: prisma.ownershipType,
} as const;
export type LookupKind = keyof typeof LOOKUP_MODELS;

export async function createLookupItemAction(kind: LookupKind, formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);
  const parsed = lookupItemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  const model = LOOKUP_MODELS[kind] as any;
  await model.create({ data: { workspaceId: user.workspaceId, name: parsed.data.name } });
  revalidatePath("/settings/lists-and-tags");
}

export async function toggleLookupItemAction(kind: LookupKind, id: string, active: boolean) {
  const user = await requireUser();
  requireAdmin(user.role);
  const model = LOOKUP_MODELS[kind] as any;
  await model.update({ where: { id }, data: { active } });
  revalidatePath("/settings/lists-and-tags");
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function updatePracticeAreaColorAction(id: string, formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);
  const colorHex = String(formData.get("colorHex") ?? "");
  if (!HEX_COLOR.test(colorHex)) throw new Error("Colour must be a 6-digit hex code, e.g. #2C4870.");
  await prisma.practiceArea.update({ where: { id }, data: { colorHex } });
  revalidatePath("/settings/lists-and-tags");
  revalidatePath("/people");
}

export async function createTagAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);
  const name = String(formData.get("name") ?? "").trim();
  const colorToken = String(formData.get("colorToken") ?? "neutral");
  if (!name) throw new Error("Tag name is required.");
  await prisma.tag.create({ data: { workspaceId: user.workspaceId, name, colorToken } });
  revalidatePath("/settings/lists-and-tags");
}

async function tagUsageCounts(tagIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (tagIds.length === 0) return counts;
  const [orgs, people, opps, mandates, intel] = await Promise.all([
    prisma.tagOnOrganization.groupBy({ by: ["tagId"], where: { tagId: { in: tagIds } }, _count: true }),
    prisma.tagOnPerson.groupBy({ by: ["tagId"], where: { tagId: { in: tagIds } }, _count: true }),
    prisma.tagOnOpportunity.groupBy({ by: ["tagId"], where: { tagId: { in: tagIds } }, _count: true }),
    prisma.tagOnMandate.groupBy({ by: ["tagId"], where: { tagId: { in: tagIds } }, _count: true }),
    prisma.tagOnIntelligenceItem.groupBy({ by: ["tagId"], where: { tagId: { in: tagIds } }, _count: true }),
  ]);
  for (const group of [orgs, people, opps, mandates, intel]) {
    for (const row of group) {
      counts[row.tagId] = (counts[row.tagId] ?? 0) + row._count;
    }
  }
  return counts;
}

/** Settings > Lists and tags (screen 39) — the usage count shown next to each tag. */
export async function listTagsWithCounts(workspaceId: string) {
  const tags = await prisma.tag.findMany({ where: { workspaceId, active: true }, orderBy: { name: "asc" } });
  const counts = await tagUsageCounts(tags.map((t) => t.id));
  return tags.map((t) => ({ ...t, count: counts[t.id] ?? 0 }));
}

export async function renameTagAction(tagId: string, name: string) {
  const user = await requireUser();
  requireAdmin(user.role);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name is required.");
  await prisma.tag.update({ where: { id: tagId }, data: { name: trimmed } });
  revalidatePath("/settings/lists-and-tags");
}

/** Moves every use of `fromTagId` onto `intoTagId`, then deactivates `fromTagId`. */
export async function mergeTagAction(fromTagId: string, intoTagId: string) {
  const user = await requireUser();
  requireAdmin(user.role);
  if (fromTagId === intoTagId) throw new Error("Choose a different tag to merge into.");

  async function mergeJoinTable<K extends string>(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    modelName: "tagOnOrganization" | "tagOnPerson" | "tagOnOpportunity" | "tagOnMandate" | "tagOnIntelligenceItem",
    key: K,
  ) {
    const model = (tx as any)[modelName];
    const rows: { id: string; [k: string]: unknown }[] = await model.findMany({ where: { tagId: fromTagId } });
    const alreadyTagged = new Set(
      (await model.findMany({ where: { tagId: intoTagId }, select: { [key]: true } })).map((r: Record<string, unknown>) => r[key]),
    );
    for (const row of rows) {
      if (alreadyTagged.has(row[key])) {
        await model.delete({ where: { id: row.id } });
      } else {
        await model.update({ where: { id: row.id }, data: { tagId: intoTagId } });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await mergeJoinTable(tx, "tagOnOrganization", "organizationId");
    await mergeJoinTable(tx, "tagOnPerson", "personId");
    await mergeJoinTable(tx, "tagOnOpportunity", "opportunityId");
    await mergeJoinTable(tx, "tagOnMandate", "mandateId");
    await mergeJoinTable(tx, "tagOnIntelligenceItem", "intelligenceItemId");
    await tx.tag.update({ where: { id: fromTagId }, data: { active: false } });
  });

  revalidatePath("/settings/lists-and-tags");
}

export async function deleteTagAction(tagId: string) {
  const user = await requireUser();
  requireAdmin(user.role);
  await prisma.$transaction([
    prisma.tagOnOrganization.deleteMany({ where: { tagId } }),
    prisma.tagOnPerson.deleteMany({ where: { tagId } }),
    prisma.tagOnOpportunity.deleteMany({ where: { tagId } }),
    prisma.tagOnMandate.deleteMany({ where: { tagId } }),
    prisma.tagOnIntelligenceItem.deleteMany({ where: { tagId } }),
    prisma.tag.update({ where: { id: tagId }, data: { active: false } }),
  ]);
  revalidatePath("/settings/lists-and-tags");
}

export async function createCustomFieldAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);
  const label = String(formData.get("label") ?? "").trim();
  const entityType = String(formData.get("entityType") ?? "");
  const fieldType = String(formData.get("fieldType") ?? "");
  if (!label || !entityType || !fieldType) throw new Error("Label, entity type and field type are required.");
  await prisma.customFieldDefinition.create({ data: { workspaceId: user.workspaceId, label, entityType: entityType as any, fieldType: fieldType as any } });
  revalidatePath("/settings/custom-fields");
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!firstName || !lastName) throw new Error("First and last name are required.");
  await prisma.user.update({ where: { id: user.id }, data: { firstName, lastName, timezone: timezone || undefined } });
  revalidatePath("/settings/profile");
}

export type ChangePasswordState = { error?: string; success?: boolean };

/** Round 4 screen 32 (R4SetProfile) — small dialog: current password, new password, confirm. */
export async function changePasswordAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (newPassword.length < 8) return { error: "Use at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "Passwords don't match." };

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = record.passwordHash ? await bcrypt.compare(currentPassword, record.passwordHash) : false;
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { success: true };
}

/** Round 4 screen 32 — saves straight to the user's notificationPreferences JSON column, no migration needed. */
export async function updateNotificationPreferencesAction(preferences: Record<string, { inApp: boolean; email: boolean }>) {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { notificationPreferences: preferences } });
  revalidatePath("/settings/notifications");
}
