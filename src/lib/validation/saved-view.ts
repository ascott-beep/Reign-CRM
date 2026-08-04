import { z } from "zod";

/**
 * Saved views never execute arbitrary query fragments — filterJson is a
 * plain object of allowlisted keys interpreted by src/lib/saved-views.ts
 * per entity type. This schema bounds the shape (primitive / array-of-
 * primitive values only) before anything is persisted.
 */
const filterValue = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);

export const savedViewFilterSchema = z.record(z.string(), filterValue);

export const savedViewFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  entityType: z.enum(["ORGANIZATION", "PERSON", "OPPORTUNITY", "MANDATE", "TASK", "INTELLIGENCE"]),
  shared: z.coerce.boolean().optional(),
  filterJson: savedViewFilterSchema,
});
