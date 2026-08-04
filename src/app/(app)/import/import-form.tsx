"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportRowResult } from "@/lib/import";

export function ImportForm({
  action,
  templateColumns,
  templateExample,
}: {
  action: (formData: FormData) => Promise<ImportRowResult[]>;
  templateColumns: string[];
  templateExample: string;
}) {
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const rows = await action(formData);
      setResults(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setPending(false);
    }
  }

  const created = results?.filter((r) => r.status === "created").length ?? 0;
  const skipped = results?.filter((r) => r.status === "skipped_duplicate").length ?? 0;
  const errors = results?.filter((r) => r.status === "error").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 text-sm">
        <p className="font-medium text-[var(--color-ink)]">Expected columns (header row required)</p>
        <p className="mt-1 font-mono text-xs text-[var(--color-ink-subtle)]">{templateColumns.join(",")}</p>
        <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">{templateExample}</p>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">CSV file</Label>
          <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        <fieldset className="flex flex-col gap-2">
          <Label>If a row matches an existing record</Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="duplicateStrategy" value="skip" defaultChecked /> Skip it (default)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="duplicateStrategy" value="create" /> Create as a distinct record anyway
          </label>
        </fieldset>
        {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Importing…" : "Import"}
          </Button>
        </div>
      </form>

      {results ? (
        <div>
          <div className="mb-3 flex gap-2">
            <Badge tone="success">{created} created</Badge>
            <Badge tone="warning">{skipped} skipped (duplicate)</Badge>
            <Badge tone="danger">{errors} errors</Badge>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.rowNumber}>
                    <TableCell>{r.rowNumber}</TableCell>
                    <TableCell>
                      <Badge tone={r.status === "created" ? "success" : r.status === "error" ? "danger" : "warning"}>{r.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{r.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
