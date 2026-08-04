/**
 * Organisation relationships are stored once (source -> target) but must
 * display correctly from both sides without a duplicate inverse row.
 * This maps each relationship type to how it reads from the source side
 * ("forward") and from the target side ("inverse").
 */
const FORWARD_LABELS: Record<string, string> = {
  CURRENT_INVESTOR_IN: "Current investor in",
  FORMER_INVESTOR_IN: "Former investor in",
  CO_INVESTOR_WITH: "Co-investor with",
  PARENT_OF: "Parent of",
  SUBSIDIARY_OF: "Subsidiary of",
  ADVISER_TO: "Adviser to",
  LENDER_TO: "Lender to",
  PARTNER_OF: "Partner of",
  OTHER: "Related to",
};

const INVERSE_LABELS: Record<string, string> = {
  CURRENT_INVESTOR_IN: "Current investor",
  FORMER_INVESTOR_IN: "Former investor",
  CO_INVESTOR_WITH: "Co-investor with",
  PARENT_OF: "Subsidiary of",
  SUBSIDIARY_OF: "Parent company",
  ADVISER_TO: "Advised by",
  LENDER_TO: "Lending from",
  PARTNER_OF: "Partner of",
  OTHER: "Related to",
};

export function forwardRelationshipLabel(type: string) {
  return FORWARD_LABELS[type] ?? type;
}

export function inverseRelationshipLabel(type: string) {
  return INVERSE_LABELS[type] ?? type;
}
