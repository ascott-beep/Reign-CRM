"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function SubmitButton({ submitLabel }: { submitLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : submitLabel}
    </Button>
  );
}

/** Round 5 screens 02-06: title, Cancel and Save sit in a header that sticks to the top of the page while the form scrolls below it. */
export function FormPageHeader({
  section,
  title,
  submitLabel,
  onCancel,
}: {
  section: string;
  title: string;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-3 -mt-2.5 mb-5 flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-bg)] px-3 pb-4 pt-2.5">
      <div>
        <div className="text-[13px] text-[var(--color-ink-subtle)]">{section}</div>
        <h1 className="m-0 text-[22px] font-light leading-tight tracking-[-0.01em] text-[var(--color-ink)]">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton submitLabel={submitLabel} />
      </div>
    </div>
  );
}
