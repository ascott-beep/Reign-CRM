import { z } from "zod";
import { DocumentCategory } from "@prisma/client";

export const documentUploadSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  category: z.nativeEnum(DocumentCategory).default("OTHER"),
  restricted: z.coerce.boolean().optional(),
  organizationId: z.string().optional(),
  personId: z.string().optional(),
  opportunityId: z.string().optional(),
  mandateId: z.string().optional(),
  candidateProcessId: z.string().optional(),
  intelligenceItemId: z.string().optional(),
});
