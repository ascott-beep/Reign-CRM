import { Badge } from "@/components/ui/badge";

/**
 * Reign's own practice-area palette uses solid pastel fills with dark ink
 * text (not tinted-outline chips) — deliberately fixed dark text regardless
 * of app theme, since these are always a "light surface" island matching
 * the brand reference, not a status indicator that needs to invert in dark
 * mode.
 */
export function PracticeAreaBadge({ name, colorHex }: { name: string; colorHex: string | null }) {
  const color = colorHex ?? "#E4E2DD";
  return (
    <Badge tone="outline" className="border-transparent font-semibold" style={{ backgroundColor: color, color: "#101B2D" }}>
      {name}
    </Badge>
  );
}
