import "server-only";
import { prisma } from "@/lib/prisma";

/** Generates the next human-readable mandate reference, e.g. R-2026-0005. */
export async function generateMandateReference(workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `R-${year}-`;
  const last = await prisma.mandate.findFirst({
    where: { workspaceId, reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  const lastNumber = last ? Number(last.reference.slice(prefix.length)) : 0;
  const next = (Number.isFinite(lastNumber) ? lastNumber : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
