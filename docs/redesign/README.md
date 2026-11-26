# Reign CRM redesign — reference pack

- SPEC.md — export the "Reign CRM redesign — build spec for Claude Code" doc as Markdown and save it here.
- tokens.css — all colours (light + dark), font, radii and spacing as CSS variables. Use these, never raw hex.
- tailwind.reign.ts — Tailwind theme extension mapping utility names to the variables.
- reign-logo.svg / reign-mark.svg — logo (full signature / mark only), drawn in currentColor.
- screens/ — every screen at 1440x900 in light and dark: NN-name-light.png / -dark.png, plus a standalone
  .html of each with the exact markup and inline styles used in the design. Data shown is sample data from
  the live CRM on 25 Nov 2026. Interactive bits (toggles, menus) are shown in their default state.

Dialogs (screens/dialogs/): d01 create mandate, d02 add candidate, d03 mark filled, d04 exit candidate,
d05 lost reason, d06 on hold, d07 merge duplicates, d08 quick create, d09 search (cmd+K), d10 filter popover.

Screens: 01 overview, 02 opportunities, 03 mandates, 04 mandate record, 05 person record,
06 organisation record, 07 organisations list, 08 people list, 09 tasks, 10 intelligence, 11 reports.
