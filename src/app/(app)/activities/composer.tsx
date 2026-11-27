"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Users as MeetingIcon, SquareCheck, Mail, Clock, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { submitComposerAction, submitComposerNoteAction, type ComposerKind, type ComposerLinkContext } from "./composer-actions";
import { uploadDocumentAction } from "../documents/actions";

const KIND_OPTIONS: { value: ComposerKind; label: string; icon: typeof Phone }[] = [
  { value: "CALL", label: "Call", icon: Phone },
  { value: "MEETING", label: "Meeting", icon: MeetingIcon },
  { value: "TASK", label: "Task", icon: SquareCheck },
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "DEADLINE", label: "Deadline", icon: Clock },
];

const OUTCOME_OPTIONS = [
  { value: "CONNECTED", label: "Connected" },
  { value: "VOICEMAIL", label: "Voicemail" },
  { value: "NO_ANSWER", label: "No answer" },
] as const;

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

type ComposerTab = "activity" | "note" | "email" | "file";

export function Composer({
  linkContext,
  currentUserId,
  people,
  documentLinkField,
  hasMailboxConnection = false,
}: {
  linkContext: ComposerLinkContext;
  currentUserId: string;
  /** The record's contacts, and on mandates its candidates — section 4's "With" picker. */
  people: { id: string; name: string }[];
  documentLinkField?: "organizationId" | "personId" | "opportunityId" | "mandateId" | "candidateProcessId" | "intelligenceItemId";
  /** Round 2 section 7 — whether the current user has an active, email-sync-enabled mailbox connection, so the Email tab can say whether it will really send. */
  hasMailboxConnection?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ComposerTab>("activity");
  const [kind, setKind] = useState<ComposerKind>("CALL");
  const [withPersonId, setWithPersonId] = useState<string>(people[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [when, setWhen] = useState(() => dateOnly(new Date()));
  const [pickingDate, setPickingDate] = useState(false);
  const [duration, setDuration] = useState("");
  const [markAsDone, setMarkAsDone] = useState(true);
  const [outcome, setOutcome] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [noteText, setNoteText] = useState("");
  const [pending, setPending] = useState(false);

  const withPersonName = people.find((p) => p.id === withPersonId)?.name ?? "";
  const autoSubject = useMemo(() => {
    const kindLabel = KIND_OPTIONS.find((k) => k.value === kind)?.label ?? "";
    if (!withPersonName) return kindLabel;
    return kind === "TASK" || kind === "DEADLINE" ? `${kindLabel}: ${withPersonName}` : `${kindLabel} ${withPersonName}`;
  }, [kind, withPersonName]);

  const effectiveSubject = subjectTouched ? subject : autoSubject;
  const canMarkDone = kind === "CALL" || kind === "MEETING" || kind === "EMAIL";

  function resetForm() {
    setSubject("");
    setSubjectTouched(false);
    setWhen(dateOnly(new Date()));
    setPickingDate(false);
    setDuration("");
    setOutcome("");
    setNotes("");
  }

  async function handleQuickDate(choice: "today" | "tomorrow" | "next-week") {
    const d = new Date();
    if (choice === "tomorrow") d.setDate(d.getDate() + 1);
    if (choice === "next-week") d.setDate(d.getDate() + 7);
    setWhen(dateOnly(d));
    setPickingDate(false);
  }

  async function handleSaveActivity() {
    setPending(true);
    try {
      await submitComposerAction({
        kind,
        markAsDone: canMarkDone && markAsDone,
        subject: effectiveSubject || KIND_OPTIONS.find((k) => k.value === kind)!.label,
        when,
        durationMinutes: kind === "MEETING" && duration ? Number(duration) : undefined,
        outcome: canMarkDone && markAsDone && kind === "CALL" && outcome ? (outcome as "CONNECTED" | "VOICEMAIL" | "NO_ANSWER") : undefined,
        notes: notes || undefined,
        personId: withPersonId || null,
        assignedUserId: currentUserId,
        link: linkContext,
      });
      resetForm();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleSaveNote() {
    if (!noteText.trim()) return;
    setPending(true);
    try {
      await submitComposerNoteAction({ notes: noteText, assignedUserId: currentUserId, link: { ...linkContext, personId: withPersonId || undefined } });
      setNoteText("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div role="tablist" aria-label="Log" className="mb-4 flex gap-[3px] rounded-[4px] border border-[var(--color-line)] bg-[var(--color-sunk)] p-[3px]">
          {(
            [
              ["activity", "Activity"],
              ["note", "Note"],
              ["email", "Email"],
              ["file", "File"],
            ] as const
          ).map(([value, tabLabel]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "h-7 rounded-[3px] px-3.5 text-[13px]",
                tab === value ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
              )}
            >
              {tabLabel}
            </button>
          ))}
        </div>

        {tab === "activity" || tab === "email" ? (
          <div className="flex flex-col gap-3">
            {tab === "activity" ? (
              <div className="flex gap-2">
                {KIND_OPTIONS.filter((k) => k.value !== "EMAIL").map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={cn(
                      "flex h-9 flex-1 flex-col items-center justify-center gap-1 rounded-[6px] border px-2 text-[12px]",
                      kind === k.value ? "border-[var(--color-navy)] bg-[var(--color-chip-strong)] text-[var(--color-chip-strong-ink)]" : "border-[var(--color-line)] text-[var(--color-ink2)]",
                    )}
                  >
                    <k.icon className="h-4 w-4" />
                    {k.label}
                  </button>
                ))}
              </div>
            ) : null}

            <Input
              value={tab === "email" ? (subjectTouched ? subject : `Email ${withPersonName}`.trim()) : effectiveSubject}
              onChange={(e) => {
                setSubject(e.target.value);
                setSubjectTouched(true);
              }}
              placeholder="e.g. Call Rebecca Nash"
            />

            <div className="flex flex-wrap items-center gap-2">
              {people.length > 0 ? (
                <Select value={withPersonId} onValueChange={setWithPersonId}>
                  <SelectTrigger className="w-48" aria-label="With">
                    <SelectValue placeholder="With…" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <div className="flex gap-1.5">
                <Button type="button" variant={when === dateOnly(new Date()) && !pickingDate ? "default" : "secondary"} className="h-8 px-2.5 text-xs" onClick={() => handleQuickDate("today")}>
                  Today
                </Button>
                <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => handleQuickDate("tomorrow")}>
                  Tomorrow
                </Button>
                <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => handleQuickDate("next-week")}>
                  Next week
                </Button>
                <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => setPickingDate(true)}>
                  Pick a date
                </Button>
              </div>
              {pickingDate ? <Input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className="h-8 w-40 text-xs" /> : null}

              {(tab === "activity" && kind === "MEETING") ? (
                <Input type="number" min={0} placeholder="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-8 w-32 text-xs" />
              ) : null}
            </div>

            <Textarea placeholder="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

            {tab === "activity" && canMarkDone ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={markAsDone} onCheckedChange={(v) => setMarkAsDone(v === true)} />
                  Mark as done
                </label>
                {markAsDone && kind === "CALL" ? (
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOME_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            ) : null}

            {tab === "email" ? (
              <p className="text-xs text-[var(--color-muted)]">
                {hasMailboxConnection
                  ? "Sends through your connected mailbox and lands in your Sent folder."
                  : "Connect your mailbox in Settings → Connections to send for real — for now this logs the email."}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (tab === "email") setKind("EMAIL");
                  handleSaveActivity();
                }}
                disabled={pending}
              >
                {pending ? "Saving…" : tab === "activity" && canMarkDone && !markAsDone ? "Schedule" : "Save"}
              </Button>
            </div>
          </div>
        ) : null}

        {tab === "note" ? (
          <div className="flex flex-col gap-3">
            <Textarea placeholder="Write a note…" rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <div className="flex justify-end">
              <Button onClick={handleSaveNote} disabled={pending || !noteText.trim()}>
                {pending ? "Saving…" : "Save note"}
              </Button>
            </div>
          </div>
        ) : null}

        {tab === "file" && documentLinkField ? (
          <FileTab documentLinkField={documentLinkField} linkContext={linkContext} onDone={() => router.refresh()} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function FileTab({
  documentLinkField,
  linkContext,
  onDone,
}: {
  documentLinkField: "organizationId" | "personId" | "opportunityId" | "mandateId" | "candidateProcessId" | "intelligenceItemId";
  linkContext: ComposerLinkContext;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkId = linkContext[documentLinkField as keyof ComposerLinkContext];

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      formData.set(documentLinkField, linkId ?? "");
      const file = formData.get("file");
      const displayName = formData.get("displayName");
      if (!displayName && file instanceof File) formData.set("displayName", file.name);
      await uploadDocumentAction(formData);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <input type="file" name="file" required className="text-sm" />
      <Input name="displayName" placeholder="Display name (optional)" />
      {error ? <p className="text-sm text-[var(--color-warn)]">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Paperclip className="h-[14px] w-[14px]" /> {pending ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </form>
  );
}
