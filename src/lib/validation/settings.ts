import { z } from "zod";
import { UserRole } from "@prisma/client";

export const inviteUserSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  role: z.nativeEnum(UserRole),
});

export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(1),
  defaultTimezone: z.string().trim().min(1),
  brandAccent: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Enter a hex colour like #1C2B4A"),
});

export const currencySettingsSchema = z.object({
  defaultCurrency: z.string().trim().length(3),
  updateRatesAutomatically: z.coerce.boolean().optional(),
});

export const staleThresholdsSchema = z.object({
  personDays: z.coerce.number().int().min(1),
  priorityOrgDays: z.coerce.number().int().min(1),
  opportunityDays: z.coerce.number().int().min(1),
  candidateProcessDays: z.coerce.number().int().min(1),
});

export const lookupItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
});
