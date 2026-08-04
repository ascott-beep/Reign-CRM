"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { parseCsv } from "@/lib/csv";
import { importPeopleFromCsv, type ImportRowResult } from "@/lib/import";
import { writeAuditLog } from "@/lib/audit";

export async function importPeopleAction(formData: FormData): Promise<ImportRowResult[]> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Select a CSV file to upload.");

  const duplicateStrategy = formData.get("duplicateStrategy") === "create" ? "create" : "skip";
  const content = await file.text();
  const rows = parseCsv(content);
  if (rows.length === 0) throw new Error("The CSV file has no data rows.");
  if (rows.length > 1000) throw new Error("Import is limited to 1000 rows at a time.");

  const results = await importPeopleFromCsv(user.workspaceId, user.id, rows, duplicateStrategy);

  await prisma.importJob.create({
    data: {
      workspaceId: user.workspaceId,
      entityType: "PERSON",
      status: "COMPLETED",
      originalFilename: file.name,
      storageKey: "n/a",
      totalRows: rows.length,
      processedRows: rows.length,
      successRows: results.filter((r) => r.status === "created" || r.status === "updated").length,
      errorRows: results.filter((r) => r.status === "error").length,
      rowReport: results as any,
      createdById: user.id,
    },
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Person",
    entityId: "bulk-import",
    action: "CREATE",
    changedFields: { totalRows: rows.length, created: results.filter((r) => r.status === "created").length },
  });

  return results;
}
