export type SearchItem = { id: string; title: string; subtitle: string; tag: string | null; duplicate?: boolean; href: string };
export type SearchGroup = { type: string; label: string; items: SearchItem[] };

/** Flat, keyboard-navigable row across whichever view is showing -- lets the panel own one highlighted-index concept instead of three. */
export type PanelRow =
  | { kind: "question"; text: string; tag: string }
  | { kind: "recent"; id: string; label: string; meta: string; href: string; recordType: string }
  | { kind: "ask-ai"; query: string }
  | { kind: "result"; groupLabel: string; item: SearchItem };
