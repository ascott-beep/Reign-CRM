import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shell/states";
import { formatShortDate } from "@/lib/datetime";
import { label } from "@/lib/labels";
import { DocumentDropzone } from "./document-dropzone";
import { DocumentRowMenu } from "./document-row-menu";

type DocumentRow = {
  junctionId: string;
  id: string;
  displayName: string;
  category: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: { firstName: string; lastName: string };
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Round 4 screen 16 (R4MandateDocuments): drop zone, then a table with a per-row "..." menu -- shared by the mandate and (eventually) other records' Documents tabs. */
export function DocumentsTab({
  linkField,
  linkId,
  documents,
}: {
  linkField: "organizationId" | "personId" | "opportunityId" | "mandateId" | "candidateProcessId" | "intelligenceItemId";
  linkId: string;
  documents: DocumentRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <DocumentDropzone linkField={linkField} linkId={linkId} />
      {documents.length === 0 ? (
        <EmptyState title="No documents" description="Drop a file above to add the first one." />
      ) : (
        <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
          <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-sm font-medium">
            {documents.length} document{documents.length === 1 ? "" : "s"}
          </div>
          <div className="grid grid-cols-[1fr_140px_140px_90px_80px_32px] gap-2 border-b border-[var(--color-line)] px-5 py-2 text-xs text-[var(--color-ink-subtle)]">
            <span>Name</span>
            <span>Type</span>
            <span>Added by</span>
            <span>Added</span>
            <span>Size</span>
            <span />
          </div>
          {documents.map((d) => (
            <div key={d.junctionId} className="grid grid-cols-[1fr_140px_140px_90px_80px_32px] items-center gap-2 border-b border-[var(--color-line)] px-5 py-2.5 text-sm last:border-b-0">
              <a href={`/api/documents/${d.id}/download`} className="flex min-w-0 items-center gap-1.5 truncate text-[var(--color-ink)]">
                <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" />
                <span className="truncate">{d.displayName}</span>
              </a>
              <Badge tone="neutral">{label(d.category)}</Badge>
              <span className="truncate text-[var(--color-ink-subtle)]">
                {d.uploadedBy.firstName} {d.uploadedBy.lastName}
              </span>
              <span className="text-[var(--color-ink-subtle)]">{formatShortDate(d.uploadedAt)}</span>
              <span className="text-[var(--color-ink-subtle)]">{formatSize(d.size)}</span>
              <DocumentRowMenu documentId={d.id} displayName={d.displayName} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
