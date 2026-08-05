import { Badge } from "@/components/ui/badge";

export function PracticeAreaBadge({ name, colorHex }: { name: string; colorHex: string | null }) {
  const color = colorHex ?? "#8a8a94";
  return (
    <Badge tone="outline" style={{ borderColor: `${color}55`, backgroundColor: `${color}1a`, color }}>
      {name}
    </Badge>
  );
}
