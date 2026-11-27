"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { useToast } from "@/components/shell/toast-provider";
import { uploadDocumentAction } from "./actions";

/** Round 4 screen 16 (R4MandateDocuments): "Drop files here or choose files" -- uploads straight away with a sensible display name, no dialog. */
export function DocumentDropzone({
  linkField,
  linkId,
}: {
  linkField: "organizationId" | "personId" | "opportunityId" | "mandateId" | "candidateProcessId" | "intelligenceItemId";
  linkId: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("displayName", file.name.replace(/\.[^/.]+$/, ""));
      fd.set("category", "OTHER");
      fd.set(linkField, linkId);
      await uploadDocumentAction(fd);
      showToast({ kind: "success", title: "Document uploaded", body: file.name });
      router.refresh();
    } catch (e) {
      showToast({ kind: "error", title: "Could not upload", body: e instanceof Error ? e.message : "Try again.", actionLabel: "Retry", onAction: () => upload(file) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) upload(file);
      }}
      className={`flex items-center gap-3 rounded-[6px] border border-dashed px-5 py-4 ${dragging ? "border-[var(--color-accent)] bg-[var(--color-active)]" : "border-[var(--color-line)]"}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-sunk)] text-[var(--color-muted)]">
        <Upload className="h-4 w-4" />
      </span>
      <div className="text-sm">
        {pending ? (
          <span className="text-[var(--color-ink-subtle)]">Uploading…</span>
        ) : (
          <>
            Drop files here or{" "}
            <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-[var(--color-accent)] hover:underline">
              choose files
            </button>
            <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">PDF, Word or images, up to 25 MB each</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
