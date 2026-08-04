"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/permissions";
import { createUserSchema, workspaceSettingsSchema, staleThresholdsSchema, lookupItemSchema } from "@/lib/validation/settings";
import { writeAuditLog } from "@/lib/audit";

export type SettingsFormState = { errors?: Record<string, string[]>; success?: boolean };

export async function createUserAction(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const user = await requireUser();
  requireAdmin(user.role);

  const raw = Object.fromEntries(formData.entries());
  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  const data = parsed.data;

  const existing = await prisma.user.findFirst({ where: { workspaceId: user.workspaceId, email: data.email } });
  if (existing) return { errors: { email: ["A user with this email already exists."] } };

  const passwordHash = await bcrypt.hash(data.password, 12);
  const created = await prisma.user.create({
    data: { workspaceId: user.workspaceId, firstName: data.firstName, lastName: data.lastName, email: data.email, passwordHash, role: data.role },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "User", entityId: created.id, action: "CREATE" });
  revalidatePath("/settings");
  return { success: true };
}

export async function setUserActiveAction(userId: string, active: boolean) {
  const user = await requireUser();
  requireAdmin(user.role);
  if (userId === user.id && !active) throw new Error("You cannot deactivate your own account.");
  await prisma.user.update({ where: { id: userId }, data: { active } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "User", entityId: userId, action: "UPDATE", changedFields: { active } });
  revalidatePath("/settings");
}

export async function setUserRoleAction(userId: string, role: string) {
  const user = await requireUser();
  requireAdmin(user.role);
  await prisma.user.update({ where: { id: userId }, data: { role: role as any } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "User", entityId: userId, action: "UPDATE", changedFields: { role } });
  revalidatePath("/settings");
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
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function updateStaleThresholdsAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);

  const raw = Object.fromEntries(formData.entries());
  const parsed = staleThresholdsSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await prisma.workspace.update({ where: { id: user.workspaceId }, data: { staleThresholds: parsed.data } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Workspace", entityId: user.workspaceId, action: "UPDATE", changedFields: { staleThresholds: parsed.data } });
  revalidatePath("/settings");
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
  revalidatePath("/settings");
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
  revalidatePath("/settings");
}

export async function toggleLookupItemAction(kind: LookupKind, id: string, active: boolean) {
  const user = await requireUser();
  requireAdmin(user.role);
  const model = LOOKUP_MODELS[kind] as any;
  await model.update({ where: { id }, data: { active } });
  revalidatePath("/settings");
}

export async function createTagAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);
  const name = String(formData.get("name") ?? "").trim();
  const colorToken = String(formData.get("colorToken") ?? "neutral");
  if (!name) throw new Error("Tag name is required.");
  await prisma.tag.create({ data: { workspaceId: user.workspaceId, name, colorToken } });
  revalidatePath("/settings");
}

export async function createCustomFieldAction(formData: FormData) {
  const user = await requireUser();
  requireAdmin(user.role);
  const label = String(formData.get("label") ?? "").trim();
  const entityType = String(formData.get("entityType") ?? "");
  const fieldType = String(formData.get("fieldType") ?? "");
  if (!label || !entityType || !fieldType) throw new Error("Label, entity type and field type are required.");
  await prisma.customFieldDefinition.create({ data: { workspaceId: user.workspaceId, label, entityType: entityType as any, fieldType: fieldType as any } });
  revalidatePath("/settings");
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

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!valid) throw new Error("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}
