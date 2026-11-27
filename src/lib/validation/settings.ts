import { z } from "zod";
import { UserRole, IntelligenceType } from "@prisma/client";

export const inviteUserSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  role: z.nativeEnum(UserRole),
});

/** Round 4 screen 37 (R4SetWorkspace): no brand colour picker, Atlas colours are fixed. Time zone is fixed to Europe/London everywhere (ground rule 5), not a per-workspace preference. */
export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(1),
});

export const currencySettingsSchema = z.object({
  defaultCurrency: z.string().trim().length(3),
  updateRatesAutomatically: z.coerce.boolean().optional(),
});

/** Round 2 section 6 — Settings -> Connections "AI research" card. */
export const aiResearchSettingsSchema = z.object({
  sweepEnabled: z.coerce.boolean().optional(),
  sweepHourUtc: z.coerce.number().int().min(0).max(23),
  signalTypes: z.array(z.nativeEnum(IntelligenceType)).default([]),
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
