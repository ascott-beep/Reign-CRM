"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canUploadDocuments, PermissionError } from "@/lib/permissions";
import { documentUploadSchema } from "@/lib/validation/document";
import { validateFile, generateStorageKey, storeFile } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

export async function uploadDocumentAction(formData: FormData) {
  const user = await requireUser();
  if (!canUploadDocuments(user.role)) throw new PermissionError("You do not have permission to upload documents.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Select a file to upload.");
  validateFile({ type: file.type, size: file.size });

  const raw = Object.fromEntries(formData.entries());
  const parsed = documentUploadSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  const storageKey = generateStorageKey(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await storeFile(storageKey, buffer, file.type);

  const document = await prisma.document.create({
    data: {
      workspaceId: user.workspaceId,
      originalFilename: file.name,
      displayName: data.displayName,
      mimeType: file.type,
      size: file.size,
      storageKey,
      category: data.category,
      restricted: data.restricted ?? false,
      uploadedById: user.id,
      organizations: data.organizationId ? { create: [{ organizationId: data.organizationId }] } : undefined,
      people: data.personId ? { create: [{ personId: data.personId }] } : undefined,
      opportunities: data.opportunityId ? { create: [{ opportunityId: data.opportunityId }] } : undefined,
      mandates: data.mandateId ? { create: [{ mandateId: data.mandateId }] } : undefined,
      candidateProcesses: data.candidateProcessId ? { create: [{ candidateProcessId: data.candidateProcessId }] } : undefined,
      intelligenceItems: data.intelligenceItemId ? { create: [{ intelligenceItemId: data.intelligenceItemId }] } : undefined,
    },
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Document",
    entityId: document.id,
    action: "CREATE",
    changedFields: { displayName: document.displayName, category: document.category },
  });

  if (data.organizationId) revalidatePath(`/organisations/${data.organizationId}`);
  if (data.personId) revalidatePath(`/people/${data.personId}`);
  if (data.mandateId) revalidatePath(`/mandates/${data.mandateId}`);
  if (data.opportunityId) revalidatePath(`/opportunities/${data.opportunityId}`);
}
