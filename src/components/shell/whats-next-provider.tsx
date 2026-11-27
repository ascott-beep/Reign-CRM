"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { WhatsNextDialog } from "@/app/(app)/tasks/whats-next-dialog";
import type { CompletedTaskSummary } from "@/app/(app)/tasks/actions";

const WhatsNextContext = createContext<((task: CompletedTaskSummary) => void) | null>(null);

/**
 * Round 2 section 4 "What's next?" popup — mounted once here, above every
 * page, so it survives the task list re-rendering (and the completed row's
 * own component unmounting) when completing a task triggers a
 * `revalidatePath` refresh. Ticking done lives in TaskCheckbox/TaskRowActions,
 * which call `useWhatsNext()` from wherever they're rendered instead of
 * holding the dialog's open state themselves.
 */
export function WhatsNextProvider({ children }: { children: ReactNode }) {
  const [task, setTask] = useState<CompletedTaskSummary | null>(null);

  return (
    <WhatsNextContext.Provider value={setTask}>
      {children}
      <WhatsNextDialog task={task} onClose={() => setTask(null)} />
    </WhatsNextContext.Provider>
  );
}

export function useWhatsNext() {
  const open = useContext(WhatsNextContext);
  if (!open) throw new Error("useWhatsNext must be used within WhatsNextProvider");
  return open;
}
