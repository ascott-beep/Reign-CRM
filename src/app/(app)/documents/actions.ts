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

async function revalidateDocumentLinks(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { organizations: true, people: true, opportunities: true, mandates: true },
  });
  if (!doc) return;
  for (const o of doc.organizations) revalidatePath(`/organisations/${o.organizationId}`);
  for (const p of doc.people) revalidatePath(`/people/${p.personId}`);
  for (const o of doc.opportunities) revalidatePath(`/opportunities/${o.opportunityId}`);
  for (const m of doc.mandates) revalidatePath(`/mandates/${m.mandateId}`);
}

/** Round 4 screen 16 (R4MandateDocuments): row menu "Rename". */
export async function renameDocumentAction(documentId: string, displayName: string) {
  const user = await requireUser();
  if (!canUploadDocuments(user.role)) throw new PermissionError("You do not have permission to manage documents.");
  if (!displayName.trim()) throw new Error("Enter a name.");

  const before = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  await prisma.document.update({ where: { id: documentId }, data: { displayName: displayName.trim() } });
  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Document",
    entityId: documentId,
    action: "UPDATE",
    changedFields: { displayName: { before: before.displayName, after: displayName.trim() } },
  });
  await revalidateDocumentLinks(documentId);
}

/** Round 4 screen 16: row menu "Change type". */
export async function changeDocumentCategoryAction(documentId: string, category: string) {
  const user = await requireUser();
  if (!canUploadDocuments(user.role)) throw new PermissionError("You do not have permission to manage documents.");

  const before = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  await prisma.document.update({ where: { id: documentId }, data: { category: category as never } });
  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Document",
    entityId: documentId,
    action: "UPDATE",
    changedFields: { category: { before: before.category, after: category } },
  });
  await revalidateDocumentLinks(documentId);
}

/** Round 4 screen 16: row menu "Delete". Documents have no soft-delete / recently-deleted entry (unlike the main record types), so this is a hard delete; the junction rows cascade. */
export async function deleteDocumentAction(documentId: string) {
  const user = await requireUser();
  if (!canUploadDocuments(user.role)) throw new PermissionError("You do not have permission to manage documents.");

  const before = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  await revalidateDocumentLinks(documentId);
  await prisma.document.delete({ where: { id: documentId } });
  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Document",
    entityId: documentId,
    action: "DELETE",
    changedFields: { displayName: before.displayName },
  });
}
