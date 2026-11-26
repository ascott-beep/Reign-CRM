@AGENTS.md

## Redesign
- Follow docs/redesign/SPEC.md for all UI work. Reference screens (PNG + HTML, light and dark) are in docs/redesign/screens/, pop-ups in docs/redesign/screens/dialogs/.
- Use the CSS variables in docs/redesign/tokens.css (Tailwind mapping in docs/redesign/tailwind.reign.ts); never hard-code colours, radii or font sizes.
- Copy exact values (sizes, spacing, colours, radii) from the reference HTML files and override any component library defaults that differ.
- Plain language in the UI: one status per row, verbs first for actions, no codes (no A/B ratings, no initials-only badges).
- Build in the phases in SPEC.md section 8, one phase per branch (redesign-phase-N), pushed for a Vercel preview. Never push redesign work straight to main.
- Back up the database and test migrations on a copy before any schema change.
