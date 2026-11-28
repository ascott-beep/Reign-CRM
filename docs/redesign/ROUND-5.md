# Atlas · Round 5 build brief

From Adam's review of the live site plus my own check of every page. Pictures are in `docs/redesign/screens/round5/` (light and dark). Same ground rules as round 4: nothing built without a design, no dashes, plain English, UK time, match the pictures.

Work on a new branch `round-5` from `main`. One commit per part. Preview, don't merge. Purge job stays in DRY_RUN.

## Part A · Fixes found on the live site

1. **"Desk" is gone.** "Desk overview" becomes "Overview". "All desks" becomes "Everyone" (Overview, Tasks, Opportunities, Mandates). Anywhere else "desk" appears, use "user" or the person's name.
2. **No "≈" or "~" before money** (Overview "Fees placed", Opportunities totals). Converted totals say "in EUR" or "in GBP" in the label instead.
3. **No "e.g." placeholders anywhere.** Found on Tasks quick add, New organisation, New person, New opportunity. Empty fields are empty. Search boxes say "Search".
4. **No descriptor or explainer text anywhere**: not under fields, not in drop zones, not under buttons, not in empty states beyond a short title. Found so far: ("We suggest Client · Role…", "Only if the role sits at a portfolio company…", "Start typing to find or add…").
5. **No grab (hand) cursor** on pipeline and mandate cards (35 and 28 elements found). Arrow on cards and rows, pointer only on links and buttons.
6. **Focus ring stays on buttons after clicking** (New task and others). Use `:focus-visible` only, and stop menus and dialogs putting focus back with a visible ring after a mouse click.
7. **Controls don't line up.** Tasks toolbar: Mine/Team, New task and the person picker are different heights. Every toolbar control is 36px, form fields 40px, chips 28px, everywhere (see 01).
8. **Form save bars sit outside the page and make the sidebar jump.** Remove the fixed bottom bar from all forms. Save lives in the card header (see 02 to 06). The sidebar is fixed full height and never moves when the page scrolls.
9. **New task menu shows letters** (T, A, P…). Show titles only. Same for the + New menu.
10. **Remove the colour legend** under lists ("Next action overdue / due / no next action").
11. **Remove the keyboard hint bar** at the bottom of the Ask AI panel ("↵ Ask, ↑↓ Move, esc Close").
12. **Stage names in sentence case**: Signal identified, Contact identified, Contacted, Discovery arranged, Qualified, Proposal and terms. No slashes.
13. **Clean the existing data**: some records still contain "—" (such as the task "Stonebridge Travel Group — VP Finance"). Run a one-off clean-up replacing — and – with " · " in stored text, and strip them on save from now on. Fix casing of activity types: "Follow-up", "LinkedIn".
14. **Country lists** use full names, ordered United Kingdom, then DACH (Germany, Austria, Switzerland), then Benelux (Belgium, Netherlands, Luxembourg), then all others A to Z. No country codes on screen.
15. **Sectors can't be removed** once picked on New organisation. Every tag box needs a working ×.
16. **Website field** accepts `halcyonpartners.com`. Add https:// when saving; never make the user type it.
17. **Mandate candidates table header overlaps** ("Candidate" over "Where they are") at narrower widths. Replaced by the board in 09, but the List view must not overlap either.

18. **Main buttons in dark mode** are light blue, the same as AI features. Make them near-white with dark text (see 01). Light blue is only for AI (Ask AI, Research, "Filled by AI").
19. **Cards are simple.** On every board (opportunities, mandates, candidates) a card shows only who or what it is, the company and one useful line. No next steps, priority or "Critical" tags, avatar rows, day counts or progress bars on cards. Remove the bright red "Critical" box everywhere; priority can stay as a filter.
20. **AI not connected**: Intelligence, Ask AI, Research and CV reading must say plainly that they need the AI connection (see 14), not look empty or greyed out.
21. **Remove the demo data before real use.** The live database still has the sample records from setup (Oakfield, Vantage, Bracken, Katarzyna Wysocki, the "fees placed" figures, the August tasks) and the demo user Yagmur Demir. Write a one-off script that lists everything it will delete, run it on a preview branch first, then on production only after Adam confirms. A backup exists (Neon branch pre-round4-backup-2026-11-27). Keep Adam's user account.

## Part B · Practices and roles (from reign.partners)

Four practices: **Finance, Commercial, Technology & Data, Transformation**. Store practice on people (candidates and client contacts, can be more than one), opportunities and mandates.

Role titles, grouped exactly as on the practice pages. Keep them in one config file so they can be edited in Settings later.

- **Finance** · Finance leadership: Chief Financial Officer, Group CFO, Finance Director, Interim CFO, Head of Finance · Control, reporting and treasury: Group Financial Controller, Financial Controller, Head of Financial Reporting, Head of Tax, Head of Treasury · Strategic finance: Head of FP&A, Commercial Finance Director, Head of Business Control, Corporate Development Director, M&A Director
- **Technology & Data** · Technology leadership: Chief Technology Officer, Chief Product Officer, Technology Director, Product Director, Head of Product · Engineering, platform and security: Engineering Director, Head of Engineering, Head of Software Development, Head of Platform, Head of Information Security · Data, analytics and AI: Chief Data Officer, Data Director, Head of Data Engineering, Head of Analytics, Head of AI & Data Science
- **Commercial** · Commercial leadership: Chief Commercial Officer, Chief Revenue Officer, Managing Director, Commercial Director, Country Manager · Sales and customer growth: Sales Director, Head of Sales, Regional Sales Director, Head of Business Development, Head of Customer Success · Marketing and growth: Chief Marketing Officer, Marketing Director, Head of Growth, Head of Revenue Operations, Head of Partnerships
- **Transformation** · Transformation leadership: Chief Transformation Officer, Chief Operating Officer, Transformation Director, Operating Partner, Programme Director · Operations and value creation: Operations Director, Director of Operational Excellence, Head of Performance Improvement, Procurement Director, Supply Chain Director · Integration and change: Integration Director, Head of Post-Merger Integration, Change Director, PMO Director, HR Director
- Every list also has **Board and CEO**: Chief Executive Officer, Non-executive Chair, Non-executive Director. And "Use '…' as the title" for anything else.

## Part C · New fields (database)

All new fields optional. Additive migrations only.

- **Organisation type**: Private equity fund, Portfolio company, Other company (single choice).
- **Fund**: strategy (Buyout, Growth, Venture, Infrastructure, Private credit, Secondaries; multi), AUM, smallest and largest equity cheque, current fund name, fund size, vintage year, regions invested (United Kingdom, DACH, Benelux, Nordics, Middle East), offices (countries), practices they hire.
- **Portfolio company**: owned by (link to a fund organisation, plus optional fund vehicle name), co-investors (links), invested (month and year), deal type (Primary buyout, Secondary buyout, Carve-out, Growth investment, Take-private, Buy and build add-on), ownership (Majority, Minority, Co-control), expected exit (year range), revenue, EBITDA, employees band. Fund records list their portfolio companies; portfolio companies show their fund in the header with the hold period.
- **Person type**: single choice: Candidate, Client contact, Other. Replace the current multi-select (Candidate, Client Contact, Investor, Operating Partner, Talent / HR, Referrer): Investor, Operating Partner and Talent become values of "Role at the firm" on client contacts; Referrer becomes a Source.
- **Candidate**: practices, current title (role list), current company (link; "Owned by" read from its fund), seniority (C-suite, Director, Head of, Senior manager), location, PE-backed roles count, exits delivered, years in role type, deal experience (Buy and build, Carve-out, Refinancing, Exit or sale, IPO, Turnaround, Integration), sectors, base salary, bonus %, equity (None, Sweet equity, Options, Co-invest), notice period, open to (Permanent, Interim, Non-exec), status (Actively looking, Open to offers, Not looking, Placed by us), countries willing to work in, languages, CV (stored on Documents).
- **Client contact**: role at the firm (Managing Partner, Partner, Operating Partner, Principal, Investment Director, Associate, Head of Talent, Head of Portfolio, Portfolio CEO, Portfolio CFO, Chair, Non-exec, Other), practices they hire, portfolio companies they cover (links), relationship (Cold, Warm, Strong, Client), decision role (Hiring decision maker, Influencer, Gatekeeper, Referrer).
- **CV reading**: on upload, AI reads the CV and fills the candidate fields, each marked "Filled by AI" until edited. Build it so it works once the AI key is added; until then, the CV just uploads.

## Part D · Every design, with how it works

### Rules for every page

**01 · Controls and rules** (`01-R5Controls-light.png` / `-dark.png`)

• One height per control type, everywhere: toolbar 36px, form field 40px, chip 28px, small row button 30px.
• Focus ring only with :focus-visible. When a menu or dialog closes after a mouse click, do not show the ring on the button that opened it (Radix: onCloseAutoFocus prevent default when opened by pointer).
• These rules apply to every page, including ones built before round 5.


### Forms · centred, save in the header, fields by type

**02 · New organisation · fund** (`02-R5OrgFund-light.png` / `-dark.png`)

• Centred, 960px. Title, Cancel and Save sit in the card header, which sticks to the top while you scroll. Nothing below the card, no page footer bar.
• No "e.g." text and no helper sentences in any field. Empty fields are just empty.
• No "More details". Every field that matters for the type is shown, grouped with a label column on the left.
• "What is it" decides the fields below: Private equity fund, Portfolio company, Other company.
• Website accepts halcyonpartners.com. We add https:// ourselves when saving.
• Country lists use full names. Order: United Kingdom, then DACH (Germany, Austria, Switzerland), then Benelux (Belgium, Netherlands, Luxembourg), then everything else A to Z.
• Sectors and Offices in are tag boxes: type to add, × to remove.
• Regions they invest in: United Kingdom, DACH, Benelux, Nordics, Middle East.
• Save needs only the name. Esc or Cancel asks before throwing away changes.

**03 · New organisation · portfolio company** (`03-R5OrgPortco-light.png` / `-dark.png`)

• Owned by links to a fund that is already in Atlas (search), or adds a new fund inline. You can pick the fund vehicle too (Halcyon Partners · Fund III).
• The fund's record lists all its portfolio companies, and the portfolio company shows its fund in the header.
• Deal type: Primary buyout, Secondary buyout, Carve-out, Growth investment, Take-private, Buy and build add-on.
• Ownership: Majority, Minority, Co-control.
• Expected exit and Invested drive a "hold period" line on the record (such as "2 years 8 months into hold") and feed Intelligence.
• Size bands: Revenue, EBITDA (money with currency), Employees (bands).
• Leadership: the people at the company and their roles, linked to People.

**04 · New person · candidate** (`04-R5PersonCandidate-light.png` / `-dark.png`)

• "Who are they" is a single choice: Candidate, Client contact, Other. The page changes to fit. Never more than one.
• Practice is one of the four on reign.partners: Finance, Commercial, Technology & Data, Transformation. One or more can be picked (some people span two).
• Current title is a list that depends on the practice, using the role titles from each practice page on reign.partners (15 each), with "Other title" at the bottom for anything else.
• Current company links to an organisation. If it is a portfolio company, Owned by fills in from its fund automatically.
• CV: drop a file and Atlas reads it and fills the fields (marked "Filled by AI" until edited). The CV is stored on the person's Documents tab.
• PE experience, deal experience, package, notice, mobility and languages are the fields PE clients ask about first.
• No Source, Tags or Custom fields block on this page. Tags can be added on the record later.
• Save button says what it saves: Save candidate, Save contact, Save person.

**05 · New person · client contact** (`05-R5PersonContact-light.png` / `-dark.png`)

• Role at the firm list: Managing Partner, Partner, Operating Partner, Principal, Investment Director, Associate, Head of Talent, Head of Portfolio, Portfolio CEO, Portfolio CFO, Chair, Non-exec, Other.
• Practices: which of the four practices they hire for. Drives suggestions and Intelligence.
• Covers these portfolio companies: links to organisations, so a new signal on a company points to the right person.
• Relationship: Cold, Warm, Strong, Client. Decision role: Hiring decision maker, Influencer, Gatekeeper, Referrer.

**06 · New opportunity** (`06-R5Opp-light.png` / `-dark.png`)

• Same centred form, save in the header. No explainer lines.
• Practice then Role: the role list depends on the practice (the reign.partners titles).
• Name is made automatically as "Portfolio company · Role" (or "Client · Role" when there is no portfolio company). It is shown, not typed. Rename it later on the record if needed.
• Likely fee panel removed from the form. Likely fee shows on the record and pipeline.
• Stage chips use the stage names from Settings, in sentence case (Signal identified, not Signal Identified; Proposal and terms, not Proposal / Terms).


### Pipelines, converting, mandates, Intelligence, Tasks

**07 · Opportunities pipeline** (`07-R5OppPipeline-light.png` / `-dark.png`)

• Opportunity is the lead. Mandate is the deal. Converting turns one into the other.
• Each card is kept simple: title (Portfolio company · Role), client, the client contact and their role, and the fee. No next steps, priority or day counts on the card; that lives on the record.
• Normal arrow cursor on cards, never the hand. Cards still drag: the card lifts with a shadow while dragging.
• Last column is a drop target, "Convert to mandate". Dropping a card there opens the Convert dialog (same as the button on the record).
• No colour legend on any page.
• Toolbar: all controls 36px. Board or List, Everyone (owner), All practices, New opportunity.

**08 · Opportunity · convert to mandate** (`08-R5OppConvert-light.png` / `-dark.png`)

• "Won" is renamed "Convert to mandate" everywhere and sits at the end of the stage bar as the main button, always visible.
• Before the last stage it is a normal (secondary) button, so it is clear but not pushy. At Proposal and terms it becomes the dark primary button.
• Pressing it opens the existing Convert dialog (fee, start date, lead consultant), retitled "Convert to mandate". Nothing changes until it is confirmed.
• Mark lost moves to a secondary button. ⋯ holds Edit, Delete.

**09 · Mandate · candidate board** (`09-R5MandateBoard-light.png` / `-dark.png`)

• The search process is the candidates moving through stages. This replaces the separate search progress bar and the "Move search to Offer" warning.
• Columns: Longlist, Approached, Interested, Shortlist, Client interviews, Offer, Placed. Not progressed and Withdrawn are kept in a collapsed list under the board.
• Move a candidate by dragging, or with the ⋯ on the card (Move to a stage, or Not progressed). Moving to Not progressed asks for a reason (the Exit dialog).
• The mandate's stage (the tag next to the title) is worked out from the furthest candidate, so it never needs updating by hand.
• Card is simple: photo or initials, name, current role and company. No next steps or tags on the card; click it to open the candidate's panel.
• List view keeps the existing table for sorting and bulk actions.
• Columns are a fixed 216px and the board scrolls sideways when there are more than fit. Empty columns stay visible as drop targets.
• Arrow cursor on cards, not the hand.

**10 · Role list by practice** (`10-R5RolePicker-light.png` / `-dark.png`)

• Used on mandates, opportunities and candidates.
• Pick the practice first, then Role lists that practice's titles from reign.partners, grouped as on the site:
  Finance: Finance leadership, Control reporting and treasury, Strategic finance.
  Technology & Data: Technology leadership, Engineering platform and security, Data analytics and AI.
  Commercial: Commercial leadership, Sales and customer growth, Marketing and growth.
  Transformation: Transformation leadership, Operations and value creation, Integration and change.
• Type to filter. "Use 'xyz' as the title" at the bottom for anything not on the list.
• Chief Executive Officer and Non-executive Chair appear in every practice list under "Board and CEO".

**11 · Intelligence · signal to opportunity** (`11-R5IntelToOpp-light.png` / `-dark.png`)

• Every signal card has "Create opportunity" (and "Add to existing opportunity" in its ⋯ menu).
• The dialog is filled from the signal by AI: client, portfolio company, practice, role, the best client contact (from People who cover that company), estimated fee from the role's usual base, and a first next step.
• Each pre-filled field shows "From signal" until edited.
• Creating it links the signal to the opportunity and files the article on its Activity.
• "Add to existing opportunity" opens a search of open opportunities for that client.

**12 · Tasks** (`12-R5Tasks-light.png` / `-dark.png`)

• Tabs: To do (overdue and today), Upcoming (tomorrow onwards), Done.
• Ticking a task strikes it through and it stays visible until you leave the page or refresh, then moves to Done. Undo in the toast.
• Done shows the last 30 days. Older finished tasks are not shown here but stay forever on the record's Timeline, so nothing is lost and the list never grows endlessly.
• Toolbar: all 36px. Mine or Team, person filter (shows a name, not "desks"), New task.
• New task menu: titles only, no single-letter shortcuts shown.
• "Desk" is not used anywhere. People are "users"; "All desks" becomes "Everyone".

**13 · Mandates board** (`13-R5Mandates-light.png` / `-dark.png`)

• Columns are the live mandate stages: Brief, Searching, Shortlist, Interviews, Offer. Filled mandates leave the board (they are in List, under Closed). A mandate's column is set by its furthest candidate, so you never move these by hand. Brief is the only manual stage (no candidates yet).
• Card is deliberately simple: title, client, and one line about candidates (how many at the furthest stage, or the total while searching). No next steps, priority flags, avatars or progress bars on the card. That detail lives inside the mandate.
• Click a card to open the mandate on its Candidates board.
• Filled and Closed mandates are under "Closed" in the List view.

**14 · Intelligence · AI not connected** (`14-R5IntelNoKey-light.png` / `-dark.png`)

• Shown instead of an empty, greyed-out page when no AI key is set.
• Log signal and the Signal log still work (manual signals don't need AI).
• The Watching list stays on the organisation records; the page doesn't pretend to check them.
• Same pattern wherever AI is needed (Ask AI, Research, CV reading): a short line saying it needs the AI connection, with a link for admins.

## Other practical ideas (build if quick, otherwise list as next)

- **Fee from salary**: when a mandate has a base salary range and a fee %, show the fee automatically (28% of £155,000 midpoint = £43,400).
- **Currency follows country**: United Kingdom defaults to GBP, DACH and Benelux to EUR, UAE to AED.
- **Paste a LinkedIn link** on New person to fill name, title and company (AI, once the key is in).
- **Hold-period alerts**: Intelligence flags portfolio companies 3+ years into their hold, as exits often bring leadership changes.
- **Duplicate check on organisations** by website domain, not just name.
- **Placed by Reign**: candidates placed through us show a small badge and are excluded from approach lists for 12 months (off-limits).

## Order of work (one commit each)

1. Part A fixes
2. Part B practices and role lists
3. Part C database fields
4. Forms (02 to 06)
5. Opportunities pipeline and Convert to mandate (07, 08)
6. Mandates board, candidate board and role picker (13, 09, 10)
7. Intelligence to opportunity and the AI-not-connected state (11, 14)
8. Tasks (12)

## When you finish

Send the preview link and a summary per part, anything you couldn't match, and a "Needs design" list. Don't merge.
