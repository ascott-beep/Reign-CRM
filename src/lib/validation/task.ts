import { z } from "zod";
import { TaskType, TaskStatus, TaskPriority } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  type: z.nativeEnum(TaskType).default("OTHER"),
  status: z.nativeEnum(TaskStatus).default("TODO"),
  priority: z.nativeEnum(TaskPriority).default("NORMAL"),
  assignedUserId: z.string().min(1),
  dueDate: z.coerce.date(),
  dueTime: z.preprocess(emptyToUndefined, z.string().trim().max(10).optional()),

  organizationId: z.preprocess(emptyToUndefined, z.string().optional()),
  personId: z.preprocess(emptyToUndefined, z.string().optional()),
  opportunityId: z.preprocess(emptyToUndefined, z.string().optional()),
  mandateId: z.preprocess(emptyToUndefined, z.string().optional()),
  candidateProcessId: z.preprocess(emptyToUndefined, z.string().optional()),
  intelligenceItemId: z.preprocess(emptyToUndefined, z.string().optional()),
});
