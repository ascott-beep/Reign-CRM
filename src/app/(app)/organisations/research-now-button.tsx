"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResearchPanel } from "@/components/shell/research-panel/research-panel-provider";

/** Round 4 screen 31 (R4IntelResearch): opens the docked research panel instead of showing an inline result. */
export function ResearchNowButton({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const { openForOrganization } = useResearchPanel();

  return (
    <Button variant="secondary" onClick={() => openForOrganization(organizationId, organizationName)}>
      <Sparkles className="h-[14px] w-[14px]" /> Research now
    </Button>
  );
}
