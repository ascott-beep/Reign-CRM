"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { syncPrimaryNextTask } from "@/lib/next-task";
import { startOfTodayInLondon } from "@/lib/datetime";

async function createTask(args: {
  workspaceId: string;
  assignedUserId: string;
  createdById: string;
  title: string;
  dueDate: Date;
  candidateProcessId?: string;
  placementId?: string;
}) {
  return prisma.task.create({
    data: {
      workspaceId: args.workspaceId,
      title: args.title,
      type: "FOLLOW_UP",
      status: "TODO",
      priority: "NORMAL",
      assignedUserId: args.assignedUserId,
      createdById: args.createdById,
      dueDate: args.dueDate,
      relatedRecordType: args.candidateProcessId ? "CANDIDATE_PROCESS" : args.placementId ? "PLACEMENT" : undefined,
      relatedRecordId: args.candidateProcessId ?? args.placementId,
      candidateProcesses: args.candidateProcessId ? { create: [{ candidateProcessId: args.candidateProcessId }] } : undefined,
    },
  });
}

/** Suggested-task "Add" buttons (section 5) — each creates one real task from a suggestion, then disappears on the next load since primaryNextTaskId is now set. */
export async function addSuggestedTaskAction(input:
  | { kind: "FIRST_CALL" | "CHASE_OFFER"; candidateProcessId: string; title: string }
  | { kind: "SET_NEXT_STEPS"; title: string }
  | { kind: "GUARANTEE_CHECKIN"; placementId: string; title: string; dueDate: string }) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  if (input.kind === "FIRST_CALL" || input.kind === "CHASE_OFFER") {
    const task = await createTask({
      workspaceId: user.workspaceId,
      assignedUserId: user.id,
      createdById: user.id,
      title: input.title,
      dueDate: startOfTodayInLondon(),
      candidateProcessId: input.candidateProcessId,
    });
    await syncPrimaryNextTask({ candidateProcessId: input.candidateProcessId });
    await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Task", entityId: task.id, action: "CREATE" });
  } else if (input.kind === "SET_NEXT_STEPS") {
    const task = await createTask({ workspaceId: user.workspaceId, assignedUserId: user.id, createdById: user.id, title: input.title, dueDate: startOfTodayInLondon() });
    await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Task", entityId: task.id, action: "CREATE" });
  } else if (input.kind === "GUARANTEE_CHECKIN") {
    const task = await createTask({
      workspaceId: user.workspaceId,
      assignedUserId: user.id,
      createdById: user.id,
      title: input.title,
      dueDate: new Date(input.dueDate),
      placementId: input.placementId,
    });
    await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Task", entityId: task.id, action: "CREATE" });
  }

  revalidatePath("/tasks");
}
