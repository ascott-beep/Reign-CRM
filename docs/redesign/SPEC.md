# Reign CRM redesign — build spec for Claude Code

Nov 25, 2026 · Adam Scott

## 1. How to use this spec

This spec rebuilds the front end of the existing Reign Partners CRM (crm.reign.partners, Next.js) to the new "Atlas" design, in light and dark. It keeps the existing data and features; most new behaviour is calculated from data the CRM already stores.

Reference pack (in this folder): `screens/` (reference HTML and PNG screenshots of every screen, light and dark; `screens/dialogs/` for pop-ups), `tokens.css`, `tailwind.reign.ts`, `reign-logo.svg`, `reign-mark.svg`. The `CLAUDE.md` at the repo root already points here.

**Kick-off prompt for Claude Code (Phase 1):**

```
Read docs/redesign/SPEC.md and look at docs/redesign/screens/. We are rebuilding the CRM front end to match it, in phases (section 8). Do Phase 1 only: add the design tokens (section 2) as CSS variables with light and dark themes and wire them into Tailwind; add Inter Tight and lucide-react; build the app shell and shared components in section 3; switch the existing layout to the new shell. Do not change the database or page content yet. Work on a new branch. When done, summarise what you built and anything you could not match.
```

For each later phase, start a fresh Claude Code session with: "Read docs/redesign/SPEC.md. Do Phase N only" plus the phase's line from section 8.

**Ground rules:**

- Work on a branch with a preview deployment. The live CRM holds client and candidate data.
- Back up the database before any migration (section 6).
- Keep every existing feature unless this spec says to remove or move it.
- Where this spec is silent, follow the nearest pattern in it and list the decision in the phase summary.

## 2. Design rules

Every colour, size and radius comes from these tokens. They follow the reign.partners brand: navy #0C2139, light blue #BAE1FF, orange-red accent #ED3910, light type, square-ish corners.

**Colour tokens** (set on `:root` for light and `[data-theme="dark"]` for dark; all in `tokens.css`):

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--bg` | #f2f4f7 | #07111d | Page background |
| `--side` | #ffffff | #0a1522 | Sidebar |
| `--card` | #ffffff | #0e1b2b | Cards, panels, board cards |
| `--sunk` | #f6f8fa | #0b1724 | Board columns, inset areas |
| `--line` | #e1e6ec | #1c2b3d | Borders, row dividers |
| `--ink` | #0c2139 | #e9eef4 | Main text |
| `--ink2` | #36485c | #b9c5d3 | Secondary text, values |
| `--muted` | #5d6b7a | #8796a8 | Labels, hints, column headings |
| `--navy` | #0c2139 | #bae1ff | Primary button background |
| `--navyInk` | #ffffff | #0c2139 | Primary button text |
| `--dot` | #0c2139 | #e9eef4 | Progress fill, range dots |
| `--bar` | #6f8296 | #9db6cf | Secondary bars, current step |
| `--fill` | #bae1ff | #1f4469 | Range fills |
| `--track` | #e9edf2 | #1a2839 | Empty bar tracks |
| `--chip` | #eef1f5 | #152335 | Neutral tag background |
| `--chipStrong` | #e2f1ff | #15324f | Highlight tag background, info banner |
| `--chipStrongInk` | #0c2139 | #bae1ff | Highlight tag text |
| `--active` | #eef1f5 | #132235 | Active nav item |
| `--pos` / `--posBg` | #24704a / #e2f2e9 | #6fcf97 / #11301f | Done, placed, green status dot |
| `--warn` / `--warnBg` | #b3300f / #fdebe5 | #ff8a66 / #3a1a10 | Needs you: overdue, missing, not contacted |
| `--accent` | #ed3910 | #ff6a3d | Red status dot, alert icons only |

Rule: colour carries meaning only. `--warn` = needs you, `--pos` = done or on track, everything else neutral. Small text never uses `--accent` (too low contrast); it uses `--warn`.

**Type:** Inter Tight (Google Fonts, weights 300/400/500/600) as the stand-in for the website's Neue Haas Grotesk Display. If Reign's Neue Haas licence covers web apps, use that instead with the same weights.

| Role | Size / weight |
| --- | --- |
| Page title (h1) | 26px / 300, letter-spacing -0.01em (record pages 28px) |
| Big number (KPI) | 30–34px / 300 |
| Section title (h2) | 16px / 500 |
| Body, table cells | 14px / 400 |
| Secondary line | 13px / 400, `--muted` or `--ink2` |
| Column headings, small labels | 12.5px / 400, `--muted` |
| Sidebar group labels | 11px / 400, uppercase, letter-spacing 0.16em |

Nothing smaller than 12px.

**Spacing and shape:**

- Page padding 32px top, 40px sides, 40px bottom. Gap between page sections 24px, between cards 16px.
- Card padding 20–24px. Table rows at least 46px tall (lists) or 54px (records with two lines).
- Radius: cards and board columns 6px, buttons, tags and inputs 4px, avatars and status dots round.
- Buttons 36px tall. Primary = `--navy` fill; secondary = 1px `--line` border on `--card`.
- Icons: lucide-react, 1.6–1.8 stroke, 15–18px. No emoji.

## 3. App shell and shared components

Build these once in Phase 1; every page is assembled from them.

**Sidebar** (one component on every page):

- Expanded 228px; collapsed 68px showing icons only, with the label as a tooltip. Toggle button top right of the sidebar; remember the choice per user.
- Top: the Reign signature logo (`reign-logo.svg` expanded, `reign-mark.svg` collapsed), drawn in `currentColor` so it works in both themes.
- Groups with uppercase labels: WORKSPACE (Overview, Tasks), CRM (Organisations, People, Opportunities, Mandates), INSIGHTS (Intelligence, Reports). Collapsed: groups separated by a thin line.
- Item: 34px tall, 18px Lucide icon (LayoutGrid, SquareCheck, Building2, Users, TrendingUp, Briefcase, Compass, BarChart3), label, count on the right in `--muted` (Tasks = my open overdue+today, Mandates = live, Opportunities = open, Intelligence = new). Active: `--active` fill, 500 weight, 3px `--ink` bar on the left edge.
- Bottom: user avatar (initials on `--navy`), name, role, and a settings icon button. No weekly brief card.
- Light/dark switch lives in Settings and in the user menu; default follows the system.

**Page header:** optional breadcrumb (13px muted) → h1 → one-line description (14px muted). Actions on the right, aligned to the bottom of the title block: secondary buttons, then one primary. List pages put view tabs, the filter input and the Filter button in a toolbar row under the header, not in it.

**Desk picker:** button "All desks ▾" opening a menu: All desks, My desk, then each consultant. Filters every panel on the page. Remember last choice per user.

**Components:**

| Component | Spec |
| --- | --- |
| Card | `--card`, 1px `--line`, radius 6px, padding 20–24px |
| Button | 36px, radius 4px, 13px text, icon 14px left of label; primary `--navy`/`--navyInk`, secondary outline |
| Segmented toggle | 1px border container, 3px padding; options 28px; selected = `--navy` fill (Board/List, Live/Filled, Mine/Team) |
| Tag | 12.5px, padding 3px 10px, radius 3px; neutral `--chip`/`--ink2`, highlight `--chipStrong`, done `--posBg`/`--pos`, needs-you `--warnBg`/`--warn` |
| Status dot | 10px circle: red `--accent` = next action overdue; green `--pos` = next action due today or later; grey `--muted` at 55% opacity = no next action. Tooltip and aria-label give the reason. |
| List row | CSS grid with labelled column headings (12.5px muted); row min 46px; 1px top border; whole row is a link |
| Board column | `--sunk` fill, 1px border, radius 6px, padding 12px 8px; header = stage name (14px/500) + one line (e.g. "5% likely" left, weighted £ right) + optional 4px share bar |
| Board card | Fixed 150px tall. Title clamped to 2 lines (14.5px/500), company clamped to 2 lines (13px muted), footer pinned to bottom with a top border: value or count on the left, status dot on the right |
| Stage bar | Own card. "Search stage: <name>" left, "Step n of 7" right; 7 equal segments 6px tall, gap 8px; done = `--dot`, current = `--bar`, future = `--track`; labels 13.5px under each |
| Progress (candidate) | 6 segments 5px tall + "Step n of 6" under it |
| Range dot (overview) | 6px track, `--fill` up to the dot, 14px `--dot` circle at the position |
| Tabs | 14.5px, 28px gap, 2px `--ink` underline on the active tab; completed flow steps get a small green tick before the label; no counts on tabs |
| Banner | `--chipStrong` fill, radius 6px, alert icon, one plain sentence, primary action + text "Not yet" |
| Empty state | One muted sentence + one action link. Never empty chart axes. |

## 4. Screens

Eleven screens, each with a light and dark reference in `screens/` (01 overview … 11 reports). Every page uses the shell from section 3. In-context views of every pop-up are on the design canvas's "In context" page.

### 4.1 Overview (`/dashboard`) — screens/01-overview

Must fit one 1440×900 screen with no page scroll. Header: "Good morning, <name>", date, desk picker, notifications bell, primary "+ Quick create". No search bar (⌘K opens search).

1. **Four KPI cards:** Fees placed (this year, + placements count in green), Live mandates (+ candidates in play), Offers outstanding (+ which one), Awaiting client feedback (+ who).
2. **Row A** (fills half the remaining height): **Today** summary (5/12 width) and **Live mandates** (7/12).
    - Today is a summary, not a checklist: five rows, each a big light number + label + one-line detail + chevron, opening Tasks pre-filtered. Rows: Overdue tasks (number in `--warn`), Candidates waiting on you, Offers to chase, Opportunities with no next step, Interviews this week.
    - Live mandates: one row per live mandate with the range-dot from Brief to Offer and the stage name; footer axis labels Brief · Search · Long · Short · Int. · Offer.
3. **Row B:** **Weighted pipeline** (7/12): total top right, one bar per open stage labelled "Stage · n% likely" with £ value. **Market signals** (5/12): newest 3 accepted signals with a type tag, footer "Connect feeds →".
4. Panels in a row are equal height; content spreads to fill, no dead space.

### 4.2 Opportunities (`/opportunities`) — screens/02-opportunities

Header actions: Board | Table toggle, desk picker, "Closed (n) ▾", "+ New opportunity". A key above the board: red = next action overdue, green = due today or later, grey = no next action.

- **Board:** six columns for open stages only: Signal identified, Contact identified, Contacted, Discovery arranged, Qualified, Proposal / Terms. Won, Lost and On hold leave the board and appear in the Closed tray (a strip that opens under the header).
- Column header: stage name, "n% likely", weighted £ (value × probability), a share bar.
- Card (fixed 150px): role, company, fee, status dot. Only extra: "Mark won" link when a live mandate already exists for it.
- **Table:** Opportunity, Stage · %, Value, Weighted, Owner, Days at this stage, Next step.

### 4.3 Mandates (`/mandates`) — screens/03-mandates

Same pattern as Opportunities. Board (default) | List, desk picker, "Closed (n)", "+ New mandate", status-dot key.

- **Board:** six columns: Brief, Searching, Longlist, Shortlist, Interviews, Offer. Filled, On hold, Cancelled go to the Closed tray.
- Card (fixed 150px): role, client, "n candidates", status dot.
- **List:** columns Role and client (+ Critical/priority tag), Search stage (+ "Step n of 7" or amber "Target date passed"), Candidates (count + one-line summary e.g. "1 placed, 1 at final interview"), What happens next (amber if overdue or none), Consultant.

### 4.4 Mandate record (`/mandates/[id]`) — screens/04-mandate-record

1. **Header:** breadcrumb "Mandates / R-2026-0001", role as h1 (28px/300), then client link · base range · terms · priority tag (thin vertical dividers), then "Won from <opportunity> · £ estimated fee · introduced by <fund>". Actions: Log activity, Add task, primary Add candidate.
2. **Stage bar card** (7 steps: Brief, Searching, Longlist, Shortlist, Interviews, Offer, Filled).
3. **Check banner** when a rule fires (section 5), e.g. "Laura Bennett has been placed, so this search may be finished." [Mark search as filled] [Not yet].
4. **Tabs in flow order:** Brief → Candidates → Interviews → Offer | Fees · Documents · Activity. No numbers or counts on tabs. Completed steps get a green tick. The page opens on the tab for the current stage (section 5).
5. **Candidates tab:** card titled "n candidates on this search", "Most advanced first". Columns: Candidate (name + current title), Where they are (one plain-English status tag), Progress (6-step bar + "Step n of 6"), Fit (Strong / Good / Possible), Next step (verb first; `--warn` when overdue or waiting on you). Rejected/withdrawn hidden behind one row "n candidates no longer in the process · Show".
6. **Side panel:** Your next task on this search (amber if overdue), Client side (names + role in words), Reign team, Latest note.
7. Brief, Interviews, Offer and Fees tabs: content in section 5 ("Mandate flow").

### 4.5 Person record (`/people/[id]`) — screens/05-person-record

Header: 56px round avatar, breadcrumb, name (26px/300), title · location · "Open to move" · "Strong fit" tags. Actions: Email, LinkedIn, Log activity, primary Add to mandate.

- Left: **Searches <name> is on** (role, client, ref; one status tag; next step); **Profile** (career summary, motivation, current/expected base, notice, employment history with amber prompt if empty); **Activity** (log buttons: call, email, note; stage changes not shown here).
- Right: Contact (long emails wrap), Practice areas, Consent (+ re-confirm reminder), Organisations. Cards are only as tall as their content.

### 4.6 Organisation record (`/organisations/[id]`) — screens/06-organisation-record

Header: 56px square logo tile (initials), name, type · sector · size, status, priority, "Verified <date> · re-verify" tag (amber when stale). Actions: Website, Log activity, primary "+ Add ▾".

- Four fact cards: Owned by investors for (hold period), Live mandates, Fees with this client, Last contact.
- Left: **Work with <org>** (mandates with range-dot, opportunities with value/status); **Ownership** (investors + since date, investment thesis) beside **Other companies these investors own** (tag "Live mandate" / "Exited").
- Right: People (role tags: Decision maker, HR, Fund sponsor), Signals, Details.
- PE fund records: same layout with Fund facts (vintage, AUM, strategy) and full portfolio instead of Ownership.

### 4.7 Organisations list and 4.8 People list — screens/07, screens/08

Tables, not card grids. Header: title, description, Import / export, primary New. Toolbar row: view tabs (Organisations: All, PE funds, Portfolio, Other; People: All, Candidates, Client contacts), then on the right a filter input ("Filter by name, title or company") and a "Filter" button that opens the filter popover (dialog d10).

- Organisations columns: Organisation (logo tile, name, type), Status (duplicates show an amber "Duplicate · merge" tag here), Sector / focus, Investor (portfolio count for funds), Hold ("Newly acquired" highlighted), Owner, Verified (amber when stale).
- People columns: Name (avatar, name, title), Organisation, Type (Candidate / Client contact tag), Status, Fit, Live processes (count + most advanced, or stakeholder role), Owner. Infinite scroll, no pagination.

### 4.9 Tasks (`/tasks`) — screens/09-tasks

Header: Mine | Team toggle, primary New task. Quick-add bar that reads plain English. Left: groups Overdue (label in `--warn`) / Today / Upcoming / Completed; each row: checkbox, title, type · linked record (amber "No linked record · add detail" when missing), due, priority tag. Right: **Suggested from your pipeline** with Add buttons (rules in section 5).

### 4.10 Intelligence (`/intelligence`) — screens/10-intelligence

Row 1: **Sources** card (Companies House, News feeds with Connect buttons; Team entries "On") and **Review queue** (cards with source, title, matched organisation tag, suggested type tag, Accept / Dismiss). Row 2: **Signal log** table: Signal, Organisation, Type, Confidence, Relevance, Linked work, Received.

### 4.11 Reports (`/reports`) — screens/11-reports

Desk picker, period picker, Export. Five KPI cards. Row A: Candidate funnel (share of candidates reaching each stage, last bar in `--dot`) and Opportunity pipeline by owner / by source. Row B: Data quality (count + Fix link that opens the filtered list; zero = green "All good"), Mandates by status, Activity logged. Portfolio coverage, time-to-fill and source-to-placement become separate report pages linked from here.

## 5. Business rules

Put these in one shared module (e.g. `lib/rules.ts`) so the board, lists, overview and reports all give the same answer.

**Candidate stages → 6 steps** (the 16 stored stages stay as they are; this is display only):

| Step | Name shown | Stored stages |
| --- | --- | --- |
| 1 | Identified | Sourced, Longlisted |
| 2 | Approached | Contact required, Contacted, Interested |
| 3 | Qualified | Qualified |
| 4 | With client | Submitted, Client review |
| 5 | Interviewing | First, Further, Final interview |
| 6 | Offer / placed | Offer, Placed |
| — | No longer in process (hidden by default) | Rejected, Withdrawn, On hold |

**Plain-English status per candidate** ("Where they are"): Contact required → "Not contacted yet" (`--warn` tag); Contacted → "Awaiting reply"; Interested → "Interested"; interview stages → "First / Second / Final interview"; Placed → "Placed" (`--pos` tag); others use the stage name.

**Fit:** rating A → Strong, B → Good, C → Possible. Display only.

**Next action and status dot** (opportunities, mandates, candidate processes):

- Next action = earliest open task linked to the record.
- Dot: red if that task's due date is before today; green if due today or later; grey if there is no open task.
- If no task exists, a candidate's next step text comes from a stage rule: Contact required → "Call <first name> — first contact"; Contacted → "Follow up on interest"; Client review → "Chase client for feedback"; Offer → "Chase offer response"; Placed → "Confirm start date".

**Days at this stage** = today minus the date of the latest stage change (stage history). Stale threshold (Settings › Stale thresholds): opportunities 30 days, organisation verification 60 days.

**Opportunity → mandate link:**

1. Moving an opportunity to Won opens "Create mandate?" (dialog d01) pre-filled with client, role, contacts, fund and estimated fee; on confirm the mandate starts at Brief and stores `opportunityId`.
2. The mandate header shows "Won from <opportunity> · £ estimated fee · introduced by <fund>"; the won opportunity shows "Search running → open mandate".
3. A won opportunity with a live mandate cannot move back to an open stage. If one is already in that state (Vantage CFO today), its card shows "Mark won".
4. Mandates can exist without an opportunity (direct instruction): then `source` is required (Direct client, Fund introduction, Repeat business).
5. Money sits in one place only: weighted pipeline (open opportunities) → fee forecast (live mandates, agreed fee) → fees placed (placements).
6. Lost needs a reason (d05); On hold needs a review date, which creates a task (d06).

**Mandate flow (tabs):** the record opens on the tab for its stage: Brief stage → Brief; Searching, Longlist, Shortlist → Candidates; Interviews → Interviews; Offer, Filled → Offer.

- Brief: role spec, must-haves, salary, terms signed (yes/no), client sign-off. Sign-off ticks the tab.
- Interviews: rounds by date, who is in each, feedback owed. Missing feedback after 2 days → "Chase client" suggested task.
- Offer: terms, acceptance, start date, references, guarantee end date. Acceptance moves the mandate to Filled and the fee to placed.
- Fees: retained instalments (retainer at Brief, shortlist, completion); reaching each step prompts an invoice.

**Consistency checks (banner on the mandate record):**

- A candidate is Placed but the mandate is not Filled → "<name> has been placed, so this search may be finished." [Mark search as filled] (d03)
- A candidate is at Offer but the mandate stage is before Offer → offer to move the mandate to Offer.
- Mandate is Filled with nobody Placed → ask who was placed.

**Suggested tasks** (shown on Tasks; nothing is created until the user clicks Add):

- Contact required for 2+ days with no activity → "First call with <name>".
- Offer stage with no response logged for 3 days → "Chase <client> on the <role> offer".
- Open opportunity with no open task → "Set next steps on n opportunities".
- Placed with a start date → 90-day guarantee check-in.

**Other rules:**

- Every task must link to a record. Existing unlinked tasks show an amber prompt.
- Overview "Candidates waiting on you" = processes in Contact required, Contacted or Interested with no activity for 3 days.
- Duplicate detection on create and import: same email, or name within one character plus same title or employer (people); names equal after removing Ltd/Limited/Grp/Group/punctuation (organisations). Duplicates show "Duplicate · merge" (d07).
- Hold stage from acquisition date: < 12 months Newly acquired, 12–24 Early hold, 25–48 Mid hold, 48+ Late hold.
- Highly confidential mandates hide the client name from users not on the mandate team.

## 6. Data: calculated vs new fields

Most of the redesign is calculated from data the CRM already stores. Before Phase 2, compare the lists below with the actual Prisma schema and report which "new" fields already exist under another name.

**Already stored (seen in the live CRM; reuse as is):**

- Organisations: type, status, priority, owner, sector, employees, ownership, investors with dates, hold stage, fund vintage / AUM / strategy, source, last verified.
- People: title, location, status, owner, source, practice areas, email, phone, LinkedIn, rating, move status, base (current/expected), notice, career summary, motivation, consent status and legal basis, employment history.
- Opportunities: stage, probability, value, owner, type, role, source, lead contact, related funds, expected decision, stakeholders, notes.
- Mandates: reference, stage, priority, confidentiality, owner, team, seniority, employment type, location, work arrangement, number of hires, hiring manager, HR contact, related funds, stakeholders, base range, fee type, fee %, signed terms, exclusivity, guarantee, target completion, brief fields, linked opportunity ("View mandate" exists).
- Candidate processes: stage (16 values), rating. Tasks: title, type, priority, status, due, assignee. Intelligence: title, organisation, type, confidence, relevance, received, owner. Stage history on all three pipelines.

**Calculated, no schema change:** days at this stage, next action and status dot, the 6-step mapping, plain-English status, Fit labels, candidate summaries ("1 placed, 1 at final interview"), Today counts, weighted pipeline, duplicate flags, data-quality counts, hold stage (if only acquisition date is stored), stale flags.

**New fields to add** (check the schema first):

| Record | Field | Type | Why |
| --- | --- | --- | --- |
| Opportunity | lostReason | text, required on Lost | Lost dialog, win/loss reporting |
| Opportunity | holdReviewDate | date | On hold dialog creates a review task |
| Mandate | source | enum: Direct client, Fund introduction, Repeat business | Mandates without an opportunity |
| Mandate | feeInstalments | child rows: stage, amount, invoiced (bool), invoicedAt | Fees tab and invoice prompts |
| Mandate | briefSignedOffAt | datetime | Ticks the Brief tab |
| Candidate process | exitReason, exitDecidedBy | text, required on Rejected / Withdrawn | Hidden-candidate row, reporting |
| Placement | startDate, guaranteeEndsAt | date | Offer tab, guarantee check-in |
| Interview | round, date, attendees, feedbackStatus | child of candidate process | Interviews tab, chase feedback |
| Task | linkedRecord (type + id) | required for new tasks | Every task tied to a record |
| Intelligence item | sourceType (Companies House, News, Manual), sourceUrl, reviewState (queued, accepted, dismissed) | enum / text | Review queue |
| User | monthlyFeeTarget | money | Overview and Reports targets |
| User preference | theme, sidebarCollapsed, deskFilter, savedViews (JSON) | per user | Remembered UI choices |

Run every migration on a copy of the database first, with a backup of production taken before it goes live. Existing data must keep working with the new fields empty.

## 7. Dialogs, filters and pop-ups

Existing forms keep their fields and are restyled; dialogs with new logic follow the rules in section 5. The ten new-logic dialogs are designed: build them from `screens/dialogs/` (PNG + HTML, light and dark, d01–d10).

**Shared dialog pattern:** centred panel 520–720px wide, `--card`, radius 6px, 24px padding. Title 18px/500, one plain sentence under it, fields in one column (or two side by side) with 13px labels above inputs (40px tall, 4px radius, 1px `--line`), actions bottom right (secondary "Cancel", primary verb such as "Create mandate"). Modal dialogs dim the page behind them. Esc closes; focus starts on the first field.

**Restyle only (fields unchanged):** new and edit Organisation, Person, Opportunity, Mandate; Log activity; New task (plus the required linked record); Import / export; all Settings pages.

**New logic, designed (screens/dialogs/):**

| File | Dialog | Opens from | Contents |
| --- | --- | --- | --- |
| d01 | Create mandate | Opportunity moved to Won | Client, hiring manager, fund carried over and locked; role, lead consultant, agreed fee, salary range editable; fee type Retained / Contingent / Interim sets the instalments; terms signed |
| d02 | Add candidate | "Add candidate" on mandate | Search people (already-on-search greyed), start at Identified / Approached, Fit, CV, note |
| d03 | Mark search as filled | Banner or move to Filled | Who was placed, start date, final base, guarantee end, completion fee ready to invoice, close the others with a "let them know" task |
| d04 | Take candidate off search | Candidate moved to Rejected / Withdrawn / On hold | Outcome, who decided, reason tag (required), note, keep in mind |
| d05 | Lost reason | Opportunity moved to Lost | Reason (required), winning firm, revisit date (creates task) |
| d06 | On hold | Opportunity or mandate moved to On hold | Review date with quick picks (creates task), reason |
| d07 | Merge duplicates | "Duplicate · merge" tag | Side by side, pick the value per field, summary of what moves, archive for 30 days |
| d08 | Quick create | "+ Quick create" or C | Menu: Task, Log activity, Person, Organisation, Opportunity, Mandate, each with a one-key shortcut; icon + label only |
| d09 | Search | ⌘K / Ctrl+K | Results grouped by type, top result highlighted, duplicates flagged, ">" for actions |
| d10 | Filter popover | "Filter" button on lists | Checkbox groups with counts, active filters as removable tags, "Show n results", Clear all, Save as view |

**Filters:** each list keeps its existing filter fields, shown as checkbox groups or date ranges in the Filter popover; active filters appear as removable tags in the toolbar row. "Save as view" stores the current tabs + filters as a named view per user. The desk picker (section 3) is separate and applies on top.

## 8. Build phases

Eight phases, each its own branch and pull request, checked in the Vercel preview before merging to main. Every phase ends with a summary of anything not matched.

1. **Foundations.** Tokens (section 2), light/dark switch, Inter Tight, lucide-react, sidebar, page header, desk picker, all components in section 3.
    - Done when: every existing page renders inside the new shell in both themes with no hard-coded colours left (search the codebase for hex values outside the token file).
2. **Overview.** Section 4.1 and the shared rules module (section 5).
    - Done when: it fits 1440×900 with no scroll; every number matches the old dashboard's figures for the same data.
3. **Mandates.** Board, list, mandate record with Candidates tab, stage bar, check banner, flow-order tabs (sections 4.3, 4.4), dialogs d02–d04. Schema check from section 6.
    - Done when: Vantage CFO shows the "Laura Bennett has been placed" banner; status dots match the rules; record opens on the right tab per stage.
4. **Opportunities.** Board, table, Closed tray, Won → create mandate, Lost / On hold dialogs (section 4.2, d01, d05, d06). Migrations for lostReason, holdReviewDate, mandate source.
    - Done when: winning an opportunity creates a linked mandate; weighted pipeline total equals the overview figure.
5. **Person and organisation records** (4.5, 4.6).
    - Done when: long emails wrap; hold stage and "Other companies these investors own" are calculated, not typed.
6. **Organisations and People lists** (4.7, 4.8), filter popover (d10), duplicate detection, merge dialog (d07).
    - Done when: the two known duplicates (Vantage Logistics Grp Ltd, Laura Bennet) are flagged and can be merged on the copy database without losing links.
7. **Tasks** (4.9): grouping, quick add, required linked record, suggested tasks; Quick create (d08) and ⌘K search (d09).
    - Done when: each suggestion rule in section 5 produces the expected suggestion on today's data.
8. **Intelligence and Reports** (4.10, 4.11): review queue (manual source first), signal log, report panels, data-quality Fix links.
    - Done when: no chart renders empty axes; each data-quality Fix link opens the right filtered list. Companies House and news feeds are a separate project after this.

Open questions for Adam before Phase 3: monthly fee targets per consultant; whether green dots should include future-dated actions (currently yes); whether Neue Haas Grotesk is licensed for app use.


## 9. Additions (26 Nov 2026): delete, users, currencies, login, placeholders

New reference files: screens 12–15 and dialogs d11–d13. Screen 04 (mandate record) is updated with a "⋯" More button at the end of the header actions.

### 9.1 Placeholder text (applies everywhere)
- Every text input that shows an example uses "e.g." in muted text: "e.g. hannah@reign.partners", "e.g. Hannah", "e.g. £55,500".
- Placeholders are examples only, never instructions. The label above the box says what it is; a hint under the box explains anything else.
- Go through every existing form (create/edit mandate, opportunity, person, organisation, task, activity, settings) and apply this.

### 9.2 Login (15-login)
Copy exact values from 15-login.html. Keep it to exactly this; no extra text or images.
- Very light grey page (#f6f8fa) in both themes, with two quiet CSS-only layers behind the content: a faint navy dot grid (1px dots every 22px at 9% opacity) fading out from the centre with a radial mask, and a very large, barely visible Reign mark (#f1f3f6 on #f6f8fa, ~1100px) bleeding off the bottom-right corner. No colour glow. Copy from 15-login.html.
- Box contents, in order: Email, Password with "Forgot password?" right-aligned on its label row, full-width navy "Sign in", an "or continue with" divider, then "Google" and "Microsoft" as two quiet secondary buttons side by side. No placeholder text in the boxes (the one exception to 9.1).
- Inputs and buttons 46px, 6px radius, #d5dce4 border; focus = navy border + 3px #bae1ff ring; labels 12.5px medium.
- Provider buttons: 44px, white, 1px #e1e6ec border, 14px regular #36485c text, logo 16px inline before the label (no tile). Logos: docs/redesign/google-g.png and docs/redesign/microsoft.png (or the official SVGs), full colour, never recoloured or stretched.
- Sign in with Google and Microsoft via NextAuth providers (Google, Microsoft Entra ID). Only existing, active users: match on email; unknown email shows "This account isn't set up in Reign CRM. Ask an admin to invite you." Env vars GOOGLE_CLIENT_ID/SECRET, AZURE_AD_CLIENT_ID/SECRET/TENANT_ID; hide a button if its env vars are missing.
- Errors in plain English under the field: "That email and password don't match." After sign-in, return to the page they were trying to open.

### 9.3 Delete (d11, d12, updated 04)
- Build on the existing archive: archivedAt and the archive/restore actions already exist for organisations, people, mandates and opportunities. Show it in the UI as "Delete".
- Where: "⋯" More menu at the end of every record header (mandate, opportunity, person, organisation) and in the row menu on lists. Admins only; hidden for other roles.
- d11 Delete dialog: lists what is linked, with real counts, and what happens to each (wording per record type). Optional reason (Created by mistake / Duplicate / Test data / Other). Note with the restore deadline date. Destructive button uses the warn colour and names the record: "Delete mandate".
- d12 Blocked: if a mandate has a placement or any invoiced fee, or an opportunity is Won with a linked mandate, or a person is a placed candidate, show d12 instead. Say why with the amount and date, and offer the alternative (Close search / Mark lost / Edit).
- After deleting: go back to the list and show an "Undo" toast for 8 seconds.
- Deleted (archived) records are hidden everywhere: boards, lists, search, counts, overview, reports, exports.
- Add fields (additive): archivedById, archiveReason. Log every delete and restore in activity and the audit log.
- A daily Vercel cron permanently deletes items archived more than 30 days ago (cascade linked rows that belong only to them; keep people and organisations that are linked elsewhere).

### 9.4 Settings layout (12–14)
- Settings page uses the shell, page header "Settings / Workspace, team and data", and a 200px sub-nav on the left: Users, Workspace, Currencies, Pipeline stages, Lists and tags, Custom fields, Imports, Recently deleted, Audit log.
- Existing settings tabs move into this layout unchanged in function, restyled: section title, one-line explainer, content in flat cards.

### 9.5 Users and invites (12, d13)
- Users list: avatar, name + email, role, status (Active / Invited / Deactivated), last signed in, row menu (Change role, Resend invite / Cancel invite, Send password reset, Deactivate / Reactivate, Reassign open work).
- Role labels: Admin = ADMIN, Consultant = STANDARD, Read only = READ_ONLY. Never delete a user; deactivate.
- d13 Invite: first name, last name, work email, role cards. Sends an email with a one-time link (7 days) to set a password. Replace the current "admin types a password" create-user flow.
- Forgot password on the login page uses the same token + email flow (1-hour link).
- Email: use Resend (RESEND_API_KEY env var, from address noreply@reign.partners; I'll add the DNS records). Add a PasswordToken model (userId, tokenHash, purpose invite|reset, expiresAt, usedAt).

### 9.6 Currencies (13)
- Only GBP, USD, EUR and AED anywhere a money field has a currency. Trim CURRENCIES in src/lib/iso.ts to these four.
- Money fields default to the client organisation's currency, else the workspace default.
- "Show totals in" = Workspace.defaultCurrency. Overview, board column totals, weighted pipeline, fee forecast and reports convert into it with src/lib/currency.ts; any total that includes a converted amount gets a "≈" prefix. Remove every hard-coded "GBP" in totals (e.g. dashboard weighted value).
- Records always show money in its own currency: "AED 220,000", "$180,000", "€95,000", "£55,500".
- Exchange rates: existing Workspace.exchangeRatesToGbp. Toggle "Update every morning" (new boolean field) runs a daily Vercel cron that fetches ECB rates (e.g. api.frankfurter.app); off = edit by hand. Show when and how rates were last updated.

### 9.7 Phase 9
- Build all of section 9 as Phase 9 on branch redesign-phase-9, after Phase 8. Done when: login matches 15; delete, blocked delete, undo and restore work on a copy database; invite and reset emails send; totals convert and show "≈"; every form uses "e.g." placeholders.

## 10. Backlog: everything else agreed so far

Work through 10.1 after Phase 9 on branch redesign-phase-10. Do not start 10.2 until the designs are added to docs/redesign. 10.3 is for later; don't build it. 10.4 is for Adam, listed so you know what's coming.

### 10.1 Build after Phase 9
- GDPR "Download data" on a person record (⋯ menu, admins only): one file (JSON + readable PDF or CSV) with everything held on that person: profile, contact details, consent and legal basis, searches they were on, activity, notes, documents list. Logged in the audit log.
- GDPR erasure: "Delete now" in Recently deleted removes a person permanently straight away, including notes and documents that belong only to them; keep a one-line audit entry ("Person erased on request") with no personal data.
- Placed candidates can't be deleted (9.3), but an admin can anonymise them: replace name and contact details with "Erased person", keep the placement and fee figures.
- Health check: an admin-only /api/health that confirms the database is reachable; used for uptime monitoring.

### 10.2 Needs design first (designs to follow)
- Bulk actions on People, Organisations, Opportunities and Mandates lists: select rows, then change owner, add tag, add to a search (people), export selected, delete (admins). Sticky action bar at the bottom of the list.
- Mandate record tabs not yet designed: Brief, Interviews, Offer, Fees. Until designed, keep their current content restyled with the new components.
- Sidebar product name: whether the sidebar logo becomes "Atlas" (Reign mark + Atlas), like the login page. Keep the Reign logo until confirmed.

### 10.3 Later (don't build yet)
- Email and calendar sync (Microsoft 365 / Google) so emails and meetings log themselves as activity.
- Invoicing: push fee instalments to Xero as draft invoices and read back paid status.

### 10.4 Adam's setup tasks (not code)
- Change the default admin password.
- Database host: confirm daily backups with point-in-time restore are switched on.
- Email: create a Resend account, add its DNS records to reign.partners, add RESEND_API_KEY to Vercel.
- Google and/or Microsoft sign-in: create the OAuth apps and add the client IDs and secrets to Vercel.
