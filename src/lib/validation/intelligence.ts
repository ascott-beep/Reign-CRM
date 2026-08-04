import { z } from "zod";
import { IntelligenceType, IntelligenceConfidence, CommercialRelevance, IntelligenceConfidentiality } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const intelligenceFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  organizationId: z.string().min(1, "Organisation is required"),
  type: z.nativeEnum(IntelligenceType),
  details: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  sourcePersonId: z.preprocess(emptyToUndefined, z.string().optional()),
  sourceUrl: z.preprocess(emptyToUndefined, z.string().trim().url("Enter a valid URL").optional()),
  dateReceived: z.coerce.date(),
  confidence: z.nativeEnum(IntelligenceConfidence).default("UNVERIFIED"),
  commercialRelevance: z.nativeEnum(CommercialRelevance).default("NONE"),
  confidentiality: z.nativeEnum(IntelligenceConfidentiality).default("INTERNAL"),
  ownerId: z.string().min(1),
  followUpRequired: z.coerce.boolean().optional(),
});
