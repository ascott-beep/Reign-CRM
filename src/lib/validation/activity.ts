import { z } from "zod";
import { ActivityType, ActivityDirection, ActivityOutcome } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const activityFormSchema = z.object({
  type: z.nativeEnum(ActivityType),
  direction: z.nativeEnum(ActivityDirection).default("NOT_APPLICABLE"),
  outcome: z.preprocess(emptyToUndefined, z.nativeEnum(ActivityOutcome).optional()),
  subject: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  occurredAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
  summary: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  fullNotes: z.preprocess(emptyToUndefined, z.string().trim().max(8000).optional()),
  assignedOwnerId: z.string().min(1),
  followUpRequired: z.coerce.boolean().optional(),
  followUpTitle: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  followUpDueDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),

  organizationId: z.preprocess(emptyToUndefined, z.string().optional()),
  personId: z.preprocess(emptyToUndefined, z.string().optional()),
  opportunityId: z.preprocess(emptyToUndefined, z.string().optional()),
  mandateId: z.preprocess(emptyToUndefined, z.string().optional()),
  candidateProcessId: z.preprocess(emptyToUndefined, z.string().optional()),
  intelligenceItemId: z.preprocess(emptyToUndefined, z.string().optional()),
  isInternal: z.coerce.boolean().optional(),
});
