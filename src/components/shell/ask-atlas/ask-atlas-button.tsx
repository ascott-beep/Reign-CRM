"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAskAtlas } from "./ask-atlas-provider";

const PROMPTS = ["Summarise", "What's the latest", "Who could fit this role"];

/** Round 2 section 8 "An 'Ask' button on opportunity, mandate, person and company records with suggested prompts." */
export function AskAtlasButton({ recordType, recordName }: { recordType: "opportunity" | "mandate" | "person" | "organization"; recordName: string }) {
  const { open } = useAskAtlas();
  const recordLabel = { opportunity: "opportunity", mandate: "mandate", person: "person", organization: "company" }[recordType];

  return (
    <Button
      variant="secondary"
      onClick={() => open({ recordContext: `The user is viewing the ${recordLabel} "${recordName}" in Atlas.`, suggestedPrompts: PROMPTS })}
    >
      <Sparkles className="h-[14px] w-[14px]" /> Ask
    </Button>
  );
}
