"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/permissions";
import { erasePersonRecord, anonymisePersonRecord } from "@/lib/gdpr";

/** Section 10.1 — hard-erase an already-deleted (archived) person for good. */
export async function erasePersonAction(personId: string) {
  const user = await requireUser();
  requireAdmin(user.role);

  await erasePersonRecord(personId, user.workspaceId, user.id);

  revalidatePath("/settings/recently-deleted");
  revalidatePath("/people");
}

/** Section 10.1 — the alternative to deletion for a placed candidate. */
export async function anonymisePersonAction(personId: string) {
  const user = await requireUser();
  requireAdmin(user.role);

  await anonymisePersonRecord(personId, user.workspaceId, user.id);

  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
}
