import { Badge } from "@/components/ui/badge";
import { label, statusTone } from "@/lib/labels";

/**
 * Colour alone must never communicate meaning — every status badge always
 * renders its text label alongside the tone colour.
 */
export function StatusBadge({ value }: { value: string | null | undefined }) {
  return <Badge tone={statusTone(value)}>{label(value)}</Badge>;
}
