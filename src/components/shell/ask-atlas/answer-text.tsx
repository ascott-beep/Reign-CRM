import Link from "next/link";
import { Fragment } from "react";

const TOKEN_SOURCE = /\[\[(person|organization|opportunity|mandate):([\w-]+):([^\]]+)\]\]/g;

const BASE_PATH: Record<string, string> = {
  person: "/people",
  organization: "/organisations",
  opportunity: "/opportunities",
  mandate: "/mandates",
};

/** Round 2 section 8 "Every record named in an answer is a link" — parses the [[type:id:Label]] tokens Ask Atlas is instructed to emit, no markdown dependency needed. */
export function AnswerText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const token = new RegExp(TOKEN_SOURCE);
  while ((match = token.exec(text))) {
    const [full, type, id, label] = match;
    if (match.index > lastIndex) parts.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    const basePath = BASE_PATH[type ?? ""] ?? "/";
    parts.push(
      <Link key={key++} href={`${basePath}/${id}`} className="font-medium text-[var(--color-accent)] hover:underline">
        {label}
      </Link>,
    );
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) parts.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);

  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink)]">{parts}</p>;
}
