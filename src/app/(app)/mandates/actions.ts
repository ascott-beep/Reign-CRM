"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, canViewMandate, PermissionError } from "@/lib/permissions";
import { mandateFormSchema, mandateStatusChangeSchema } from "@/lib/validation/mandate";
import { writeAuditLog, diffFields } from "@/lib/audit";
import { generateMandateReference } from "@/lib/mandate-reference";
import { areaNameForPractice, PRACTICES, type Practice } from "@/lib/practices";

export type MandateFormState = { errors?: Record<string, string[]>; formValues?: Record<string, unknown> };

/** Round 5 screen 10: resolves the form's practice key (FINANCE/COMMERCIAL/...) to its workspace PracticeArea row id. */
async function practiceAreaIdForPracticeKey(workspaceId: string, practiceKey: string | undefined): Promise<string | null> {
  if (!practiceKey || !(PRACTICES as readonly string[]).includes(practiceKey)) return null;
  const row = await prisma.practiceArea.findFirst({ where: { workspaceId, name: areaNameForPractice(practiceKey as Practice) }, select: { id: true } });
  return row?.id ?? null;
}

export async function createMandateAction(_prev: MandateFormState, formData: FormData): Promise<MandateFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = { ...Object.fromEntries(formData.entries()), tagIds: formData.getAll("tagIds") };
  const parsed = mandateFormSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  const data = parsed.data;
  // Section 5 rule 4: a mandate created directly here has no source opportunity, so a source is required.
  if (!data.source) return { errors: { source: ["Source is required for a mandate with no opportunity"] }, formValues: raw };

  const reference = await generateMandateReference(user.workspaceId);
  const practiceAreaId = await practiceAreaIdForPracticeKey(user.workspaceId, data.practiceAreaId);

  const mandate = await prisma.mandate.create({
    data: {
      workspaceId: user.workspaceId,
      reference,
      title: data.title,
      hiringOrganizationId: data.hiringOrganizationId,
      portfolioCompanyId: data.portfolioCompanyId ?? null,
      practiceAreaId,
      source: data.source,
      status: "BRIEF_RECEIVED",
      priority: data.priority,
      confidentiality: data.confidentiality,
      ownerId: data.ownerId,
      hiringManagerPersonId: data.hiringManagerPersonId ?? null,
      internalTalentPersonId: data.internalTalentPersonId ?? null,
      seniority: data.seniority ?? null,
      employmentType: data.employmentType,
      numberOfHires: data.numberOfHires,
      city: data.city ?? null,
      countryCode: data.countryCode ?? null,
      workArrangement: data.workArrangement ?? null,
      roleSummary: data.roleSummary ?? null,
      businessContext: data.businessContext ?? null,
      requiredExperience: data.requiredExperience ?? null,
      minBaseAmount: data.minBaseAmount ?? null,
      maxBaseAmount: data.maxBaseAmount ?? null,
      baseCurrency: data.baseCurrency ?? null,
      engagementModel: data.engagementModel,
      feeType: data.feeType,
      feePercentage: data.feePercentage ?? null,
      signedTerms: data.signedTerms ?? false,
      targetShortlistDate: data.targetShortlistDate ?? null,
      targetCompletionDate: data.targetCompletionDate ?? null,
      createdById: user.id,
      statusHistory: { create: [{ toStatus: "BRIEF_RECEIVED", changedById: user.id, notes: "Mandate opened." }] },
      tags: data.tagIds.length > 0 ? { create: data.tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Mandate", entityId: mandate.id, action: "CREATE" });

  revalidatePath("/mandates");
  redirect(`/mandates/${mandate.id}`);
}

export async function updateMandateAction(mandateId: string, _prev: MandateFormState, formData: FormData): Promise<MandateFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  if (!(await canViewMandate(user, mandateId))) throw new PermissionError("You do not have access to this mandate.");

  const raw = { ...Object.fromEntries(formData.entries()), tagIds: formData.getAll("tagIds") };
  const parsed = mandateFormSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  const data = parsed.data;

  const before = await prisma.mandate.findUniqueOrThrow({ where: { id: mandateId } });
  const practiceAreaId = await practiceAreaIdForPracticeKey(user.workspaceId, data.practiceAreaId);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.mandate.update({
      where: { id: mandateId },
      data: {
        title: data.title,
        hiringOrganizationId: data.hiringOrganizationId,
        portfolioCompanyId: data.portfolioCompanyId ?? null,
        practiceAreaId,
        source: data.source,
        priority: data.priority,
        confidentiality: data.confidentiality,
        ownerId: data.ownerId,
        hiringManagerPersonId: data.hiringManagerPersonId ?? null,
        internalTalentPersonId: data.internalTalentPersonId ?? null,
        seniority: data.seniority ?? null,
        employmentType: data.employmentType,
        numberOfHires: data.numberOfHires,
        city: data.city ?? null,
        countryCode: data.countryCode ?? null,
        workArrangement: data.workArrangement ?? null,
        roleSummary: data.roleSummary ?? null,
        businessContext: data.businessContext ?? null,
        requiredExperience: data.requiredExperience ?? null,
        minBaseAmount: data.minBaseAmount ?? null,
        maxBaseAmount: data.maxBaseAmount ?? null,
        baseCurrency: data.baseCurrency ?? null,
        engagementModel: data.engagementModel,
        feeType: data.feeType,
        feePercentage: data.feePercentage ?? null,
        signedTerms: data.signedTerms ?? false,
        targetShortlistDate: data.targetShortlistDate ?? null,
        targetCompletionDate: data.targetCompletionDate ?? null,
      },
    });
    // Round 4 screen 29 "Edit mandate": tags picked from existing workspace tags only (Settings > Lists and tags makes new ones) -- replace the set each save.
    await tx.tagOnMandate.deleteMany({ where: { mandateId } });
    if (data.tagIds.length > 0) {
      await tx.tagOnMandate.createMany({ data: data.tagIds.map((tagId) => ({ mandateId, tagId })) });
    }
    return result;
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Mandate",
    entityId: mandateId,
    action: "UPDATE",
    changedFields: diffFields(before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
  });

  revalidatePath(`/mandates/${mandateId}`);
  redirect(`/mandates/${mandateId}`);
}

export async function changeMandateStatusAction(input: {
  mandateId: string;
  toStatus: string;
  cancellationReason?: string;
  onHoldReason?: string;
  notes?: string;
}) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  if (!(await canViewMandate(user, input.mandateId))) throw new PermissionError("You do not have access to this mandate.");

  const parsed = mandateStatusChangeSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  const mandate = await prisma.mandate.findUniqueOrThrow({ where: { id: data.mandateId } });
  if (mandate.status === data.toStatus) return;

  await prisma.$transaction([
    prisma.mandate.update({
      where: { id: data.mandateId },
      data: {
        status: data.toStatus as any,
        statusEnteredAt: new Date(),
        cancellationReason: data.toStatus === "CANCELLED" ? (data.cancellationReason ?? null) : null,
        cancelledDate: data.toStatus === "CANCELLED" ? new Date() : null,
        onHoldReason: data.toStatus === "ON_HOLD" ? (data.onHoldReason ?? null) : null,
      },
    }),
    prisma.mandateStatusHistory.create({
      data: { mandateId: data.mandateId, fromStatus: mandate.status, toStatus: data.toStatus as any, changedById: user.id, notes: data.notes ?? null },
    }),
  ]);

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Mandate",
    entityId: data.mandateId,
    action: "STAGE_CHANGE",
    changedFields: { fromStatus: mandate.status, toStatus: data.toStatus },
  });

  revalidatePath("/mandates");
  revalidatePath(`/mandates/${data.mandateId}`);
}

