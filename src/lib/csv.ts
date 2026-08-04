import "server-only";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export function parseCsv(content: string): Record<string, string>[] {
  return parse(content, { columns: (header: string[]) => header.map((h) => h.trim()), skip_empty_lines: true, trim: true });
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return stringify(rows, { header: true, columns });
}
