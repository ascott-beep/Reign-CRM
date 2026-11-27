/** Shared with src/lib/ask-atlas.ts (server) and the answer renderer (client) -- the [[type:id:Label]] token format Ask Atlas is instructed to emit for every record it names. */
export const RECORD_TOKEN_RE = /\[\[(person|organization|opportunity|mandate):([\w-]+):([^\]]+)\]\]/g;

export type RecordToken = { type: "person" | "organization" | "opportunity" | "mandate"; id: string; label: string };

export function extractRecordTokens(text: string): RecordToken[] {
  const seen = new Map<string, RecordToken>();
  const re = new RegExp(RECORD_TOKEN_RE);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const [, type, id, label] = match;
    const key = `${type}:${id}`;
    if (!seen.has(key)) seen.set(key, { type: type as RecordToken["type"], id: id!, label: label! });
  }
  return [...seen.values()];
}
