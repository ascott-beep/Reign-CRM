# Atlas · Round 6 build brief

From a full hands-on test of every page, button and form on the round 5 preview (28 Nov), plus Adam's notes. Pictures are in `docs/redesign/screens/round6/` (light and dark). Same ground rules as rounds 4 and 5: nothing built without a design, no dashes, no descriptor or explainer text, no "e.g.", sentence case, UK time, match the pictures.

Work on a new branch `round-6` from `main`. One commit per part. Preview, don't merge. Purge job stays in DRY_RUN.

## Part A · Fix first (these break real work)

1. **L1** Sidebar fixed full height; only the main area scrolls; form headers with Save stick to the top.
2. **P1, P2** Person save fails silently when LinkedIn has no https. Add https automatically, and make every form show save errors (R6 screen 08). No silent failures anywhere.
3. **O1** Enter in a tag box submits the form. Enter only adds the tag, on every form.
4. **M1** Candidates added at "Identified" vanish from the board. Rename to Longlist everywhere and migrate existing records.
5. **S1** Ask AI shows a raw React error. Show the AI-not-connected message instead.
6. **I1, I3** Intelligence hides manual signals without AI; "Create opportunity" from a signal skips the pre-filled pop-up and fills it wrongly.
7. **U1** Name changes don't show until sign-out. Refresh the session after saving profile.
8. **Q8, Q9** Convert to mandate drops the client contact and the start date.

## Part B · Every finding, by area

Codes match the list so you can report back against them.

## Organisations
- O1 [bug, high] Pressing Enter in a tag box ("Offices in") submits the whole form and saves a half-filled record. Enter must only add the tag. Same check for every tag/combobox input on every form.
- O2 [bug] Empty required field shows the browser's own "Please fill in this field" bubble. Use our inline error under the field (red text, field border red), and scroll to the first error.
- O3 [bug] Offices in tags not saved (Germany added, missing on record and edit).
- O4 [bug] Edit organisation: Strategy chips missing; AUM pre-filled "£0" when nothing was entered. Empty money = empty field.
- O5 [design] Strategy chip labels: Title Case and extras ("Growth Equity", "Venture Capital", "Corporate/Strategic Investor", "Fund of Funds", "Family Office", "Impact", "Real Estate"). Use the designed list in sentence case: Buyout, Growth, Venture, Infrastructure, Private credit, Secondaries, Other. Family office and Corporate investor belong under "What is it" (Other company type), not strategy.
- O6 [design] Country list has no search. Make it type-to-filter.
- O7 [a11y] Currency pickers and money inputs have no labels (screen readers read nothing).
- O8 [design] Organisation record needs redesign (see R6 designs): 8 header buttons, "Research / Never verified" tags, "Work with QA" heading (first word of name), "£0" AUM and "€0" fees when empty, mixed currencies, descriptor text ("Nothing logged yet, use Log activity…", "Connect this organisation to funds or portfolio companies."), fund facts missing strategy/regions/offices, Relationships/Documents/Audit as loose sections.
- O9 [bug] Portfolio company form: Expected exit has example placeholder "2029 to 2030" (no examples). Invested uses the browser's native month picker (unstyled). Use our date menu (month + year). Employees is two free number boxes; design is a band list (1 to 50, 50 to 250, 250 to 500, 500 to 1,000, 1,000+).
- O10 [works] Owned by search finds funds and links them; the fund record lists its portfolio companies. Good.
- O11 [design] Portfolio company record: "Ownership / Current investor / Investment thesis" block, "Other companies these investors own" with explainer, Relationships table with Title Case headers (Investment Date, Exit Date, Ownership %). Covered by the R6 organisation record design.

## People
- P1 [bug, high] Saving a person with a LinkedIn link typed without https (linkedin.com/in/…) fails silently: Save does nothing, no message, nothing saved. Add https:// automatically (like Website) and, for any save that fails, show the reason inline and keep the user's input.
- P2 [bug, high] Any server-side save error is swallowed on every form. Show a red message at the top of the card ("Couldn't save: …") plus inline field errors.
- P3 [bug] Browser's own validation bubbles ("Please include an '@'", "Value must be greater than or equal to 0") instead of our inline errors. Number inputs show browser spin arrows. Use text inputs with our own formatting.
- P4 [bug] Current title search doesn't match abbreviations: "CF" doesn't find Chief Financial Officer; "CFO" should. Add common abbreviations (CFO, CTO, CPO, CDO, COO, CCO, CRO, CMO, CEO, FD, MD).
- P5 [design] Role list group headers are UPPERCASE ("FINANCE LEADERSHIP"). Sentence case, muted.
- P6 [bug] Candidate "Owned by" (fund of current company) not shown (known gap). Show it read-only once a portfolio company is chosen.
- P7 [design] Option labels in Title Case: Seniority ("Head Of", "N-1 (Direct Report to C-Suite)", "Board / C-Suite"), Equity ("Sweet Equity", "Co Invest"), Status ("Actively Looking", "Open To Offers", "Placed By Us"). Use: C-suite, Director, Head of, Senior manager, Manager, Interim, Non-exec · None, Sweet equity, Options, Co-invest · Actively looking, Open to offers, Not looking, Placed by us.
- P8 [bug] Notice period is a bare number with no unit. Use a list: Immediate, 1 month, 3 months, 6 months, 12 months.
- P9 [design] Person record needs redesign (R6 design): "Research Only" tag, "Searches Minimal is on" (first name), "£0" when empty, red warning box "No roles added. Search matching needs…", "Not Requested" consent with explainer, Practice areas shown as "+ Finance + Commercial…" add-chips, two Activity sections, tabs pushed to the bottom of the page.

## Opportunities
- Q1 [bug] Opportunity titles still contain "—" from old data ("Stonebridge Travel Group — VP Finance"). The data clean-up (Part A 13) didn't run on stored titles. Run it.
- Q2 [design] Board: column totals in EUR while cards show GBP ("€2,209" over a "£38,000" card). Show totals in the workspace default currency, consistently with cards. Card title shows the role only ("VP Finance"); design is "Company · Role".
- Q3 [design] Remove the "Convert to mandate" drop column. Board = stage columns only. Convert lives on the record (end of stage bar) and in a card ⋯ menu. See R6 design.
- Q4 [bug] Dragging a card between columns didn't move it in testing (text got selected instead). Make sure a short drag moves the card, and add ⋯ on the card with "Move to" and "Convert to mandate" so it never depends on dragging.
- Q5 [design] Opportunity record: Convert button sits top right, not at the end of the stage bar; stage bar still has a "Won" step and "Not started" under every step; "More details" expander in Key facts; Source "Existing Relationship" in Title Case. See R6 design.
- Q6 [bug] Convert dialog takes about 3 seconds showing "Loading…" before you can use it. Load the counts in the background; open instantly.
- Q7 [design] Convert dialog has descriptor text ("Estimate on the opportunity was £38,000", the blue info box) and a native date picker. Remove the text; use our date menu.
- Q8 [bug] After converting, the client contact (Nadia Hassan, hiring manager) isn't added to the mandate's client contacts ("No client contacts recorded"). Contacts must carry across (round 3 brief).
- Q9 [bug] Start date typed in the Convert dialog didn't appear on the mandate (Start date empty).

## Mandates
- M1 [bug, high] Adding a candidate at "Identified" puts them on no board column (count says 1 candidate, board shows none). "Identified" isn't a column. Rename the first stage to Longlist everywhere (Add candidate dialog, list "Where they are", progress) and map existing Identified records to Longlist.
- M2 [design] Add candidate dialog: stage choice "Identified / Approached" plus explainer "Identified = on the longlist…", placeholder "Why they fit this role". Use "Longlist / Approached", no explainer, no placeholder.
- M3 [design] Candidates tab still has Key facts beside the board and the boxes "Your next task on this search / Nothing scheduled", "Client side / No client contacts recorded", "Latest note". Board full width on this tab; those boxes belong on Timeline. See R6 design.

## Tasks
- T1 [works] Quick add parses "tomorrow" and files it under Upcoming; ticking opens the next-step pop-up with Undo toast. Good.
- T2 [bug] Quick add gives no feedback when the task lands in another tab (added "tomorrow" task, To do stays empty). Show a toast "Task added for Sun 29 Nov" with a link to it.
- T3 [bug] "Call Testy…" is saved as type Other. Detect Call/Email/Meeting from the first word.
- T4 [design] Task rows: red "No linked record · add detail" warning and a "Normal" priority tag on every row. Remove both (priority shows only when High). Link a record with a small "Link" action on hover instead.
- T5 [design] Next-step pop-up shows keyboard hints ("esc", ↵) and native date/time pickers. Remove the hints; use our date and time menus. Title reads "Call Testy about the offer done"; should be "Done: Call Testy about the offer".
- T6 [design] Tasks toolbar still has Mine/Team + Adam Scott + Everyone (three person filters). Keep Mine/Team and one person picker (only in Team).

## Intelligence
- I1 [bug, high] With AI not connected, the whole page is replaced by the "AI not connected" card, so manually logged signals are invisible. Show the To review / Accepted / Dismissed tabs and the signals as normal; put the AI card above them as a slim banner.
- I2 [bug] Log signal: organisation picker has no search (long list, typing does nothing); "What happened" values in Title Case ("Leadership Change"); explainer "Optional. Add more sources after saving." Remove the explainer, add search, sentence case.
- I3 [bug, high] "Convert to Opportunity" on a signal creates the opportunity straight away, skipping the designed pre-filled dialog (R5 screen 11). It also gets it wrong: name "QA Portco Ltd · Leadership Change" (should be "Company · Role"), client set to the portfolio company instead of its owning fund, Source "Candidate Intelligence", empty fee shown as "£0 · 5%". Open the dialog first; fill client from the owning fund, portfolio company from the signal, role from the signal type (Leadership change of a CFO → Chief Financial Officer).
- I4 [design] Signal detail page has no design (Metadata box, "Partially Verified", "Mark verified", "Convert to Opportunity" in Title Case). See R6 design.
- T7 [bug] Done tab shows tasks from August; it should only show the last 30 days.
- T8 [bug] Activity type casing in data: "Linkedin", "Follow Up". And "—" still in linked record names ("Stonebridge Travel Group — VP Finance").

## Search and Ask AI
- S1 [bug, high] Ask AI (Enter on "Ask AI about …") shows a raw error: "Minified React error #441…". With no AI key it must show the AI-not-connected message (R5 screen 14 pattern) inside the panel. Never show raw errors.
- S2 [design] Search panel still has keyboard hints ("esc", ↵) and UPPERCASE group headers (ORGANISATIONS, OPPORTUNITIES). Remove hints, sentence case headers.
- S3 [works] Search finds organisations, opportunities and signals by name. Good. People search should match first + last name.

## Notifications and menus
- N1 [bug] Bell: clicking it shows a focus ring but no panel opens.
- N2 [bug] Focus ring still appears after mouse clicks (bell, Invite user after the dialog closes). Use :focus-visible only, everywhere.
- N3 [works] + New menu opens with all items, no letter shortcuts. Good.

## Settings
- U1 [bug, high] Changing your own name in My profile saves, but the sidebar and everywhere else keep showing the old name until you sign out (name is read from the login session). Refresh the session after saving, and show a "Saved" toast. This is why "I couldn't change a user name".
- U2 [bug] Admins can't change another user's name in Users (only role). Add "Edit name" to the user's ⋯ menu.
- U3 [bug] Invite user says "Invite sent" and shows "Invited 0 seconds ago" even though email isn't set up (no Resend key), so no email went out. If email isn't connected, say "Invite created. Email isn't set up yet, copy the invite link" with a Copy link button. Use "just now" instead of "0 seconds ago".
- U4 [bug] Saving My profile changed "Password last changed" to "0 seconds ago". Only update it when the password changes.
- U5 [bug] Pipeline stages page lists mandate stages as "Brief Received, Search Active, Longlisting, Shortlisting, Interviewing", which don't match the board (Brief, Searching, Shortlist, Interviews, Offer). One source of truth, sentence case.
- U6 [design] Settings menu group labels UPPERCASE (YOU, TEAM, WORKSPACE) and /settings opens Users. Sentence case; /settings opens My profile.
- U7 [design] Pipeline stages: "% win" boxes and "Save probabilities" button not in design. Keep win % but edit it inline in the stage's edit pop-up.

## Delete and restore
- D1 [works] Delete person shows what happens to linked records, deletes, returns to the list with Undo; Undo restores. Good.
- D2 [bug] Delete dialog takes about 4 seconds on "Loading…", and its text contains "Settings — Recently deleted" (dash). Load instantly; remove the dash and the explainer box (keep the table of what happens).

## Overview
- V1 [design] "Live mandates" card uses abbreviated stage labels (Search, Long, Short, Int.) and a descriptor ("Stage reached, brief to offer"); arrows on links ("Open work queue →", "All mandates →", "Connect feeds →"). Use full stage names, no descriptor, no arrows.

## Layout (everywhere)
- L1 [bug, high] On long pages the whole layout scrolls together: the sidebar scrolls out of view and leaves a blank column, and the page header with Save scrolls away. The sidebar must be fixed full height; only the main area scrolls; the form header (title, Cancel, Save) sticks to the top of the main area.
- L2 [bug] Duplicate person filter on Mandates, Opportunities, Tasks (Everyone twice).
- L3 [bug] Native browser date and month pickers used in Convert, Next step, portfolio company Invested. Use one designed date menu everywhere.
- L4 [bug] Dialogs that load data first (Convert, Delete) show a blank "Loading…" box for 3 to 4 seconds. Open instantly with content; load counts in the background.
- L5 [bug] Empty money shown as £0 / €0 across records. Empty stays empty.

## Part C · New designs

**01 · Organisation record · fund** (`01-R6OrgFund-light.png` / `-dark.png`)

• Header: name, type tag, location, website link, owner. Actions: Log activity, New opportunity (main), ⋯ (Edit, Research, Ask AI, Delete). Website moves into the header as a link; Ask and Research go in ⋯.
• Tabs: Portfolio (default for funds), People, Timeline, Opportunities and mandates, Documents, Audit.
• Right column: Fund facts (every field from the form, Edit opens the form) and "With us" (status, live mandates, fees, last contact).
• Empty values are left out, not shown as £0. No "Research / Never verified" tags. No section headings built from the first word of the name.
• No descriptor text in empty states: an empty tab shows a single line like "No portfolio companies" and the add button.

**02 · Organisation record · portfolio company** (`02-R6OrgPortco-light.png` / `-dark.png`)

• "Owned by" fund is in the header and links to the fund.
• Tabs: Leadership (default), Timeline, Opportunities and mandates, Documents, Audit.
• Right column: Ownership (owner, fund vehicle, deal type, ownership, invested, time into hold, expected exit) and Company (sector, revenue, EBITDA, employees). Empty fields hidden.
• Replaces the old "Relationships" table, "Investment thesis" and "Other companies these investors own" blocks; the fund's Portfolio tab covers that.

**03 · Person record · candidate** (`03-R6PersonCandidate-light.png` / `-dark.png`)

• Header: name, Candidate tag, current title at company (link), city, practice tags. Actions: Log activity, Add to mandate (main), ⋯ (Edit, Ask AI, Download data, Anonymise, Delete).
• Tabs: Searches (default), Timeline, CV and documents, Audit.
• Right column: Contact, Package and move, PE experience, each with Edit. Empty fields hidden; a card with nothing in it shows just its title and "Add".
• Removes: "Research Only" tag, "Searches Minimal is on" heading, £0 values, the red "No roles added…" box, consent explainer, "+ Finance + Commercial" add chips, the duplicate Activity sections, and tabs at the bottom of the page.
• Consent moves to the ⋯ menu (Record consent) and the Audit tab.
• Client contacts use the same layout with tabs: Timeline (default), Opportunities and mandates, Documents, Audit; right column: Contact, Role at the firm, What they hire.

**04 · Opportunity record** (`04-R6OppRecord-light.png` / `-dark.png`)

• Stage bar: the stages only, no "Won" step and no "Not started" under each. Click a stage to move there.
• Convert to mandate sits at the end of the stage bar. Normal button until the last stage, then it becomes the main (dark) button. Opens the Convert pop-up.
• Header: title "Company · Role", client link, contact with role, fee and chance. Actions: Mark lost, ⋯ (Edit, Ask AI, Delete).
• Key facts show everything; no "More details" expander.
• Timeline is the default tab with the log buttons (Call, Email, Meeting, Note) on top.

**05 · Opportunities pipeline · card menu** (`05-R6OppPipeline-light.png` / `-dark.png`)

• Stage columns only. The "Convert to mandate" drop column is gone.
• Each card has ⋯ (top right): Move to (opens the stage list), Convert to mandate, Mark lost, Edit. Dragging still works, but nothing depends on it.
• Card: "Company · Role", client, contact and role, fee. Column totals in the same currency as the cards.
• One person filter (Everyone), in the toolbar only. Columns at least 200px; the board scrolls sideways when needed.
• Converted opportunities leave the board and show as Won in the List view, linked to their mandate.

**06 · Signal detail** (`06-R6Signal-light.png` / `-dark.png`)

• Title is "Company: what happened". Type as a tag in sentence case.
• Actions: Dismiss, Create opportunity (main, opens the pre-filled pop-up from R5 screen 11), ⋯ (Mark verified, Edit, Delete).
• Body: the summary and source links. Linked records below: the company, its owner fund, and people who cover it.
• Right: Signal facts (type, how sure, relevance, practice, status). No "Metadata" box, no "Partially Verified" Title Case.

**07 · Intelligence · without AI** (`07-R6IntelList-light.png` / `-dark.png`)

• Signals always show, AI or not. When AI isn't connected, a slim banner sits above the tabs: "AI not connected" with Set up (admins) and nothing else.
• Each signal row: type tag, "Company: what happened", owner fund, who logged it, date. Dismiss and Create opportunity on the row; click the row for the detail page.

**08 · Errors, date menu, saved toast** (`08-R6States-light.png` / `-dark.png`)

• Save errors: a red line at the top of the card ("Couldn't save. Check the 2 fields marked below.") and a short message under each bad field, field border red. The page scrolls to the first error. Never the browser's own bubbles. Never fail silently.
• Server errors use the same banner with the reason in plain English, and keep everything the user typed.
• Links and websites typed without https are fine: we add it.
• Date menu: our own calendar with quick picks (Today, Next Monday, In a month). Month-only fields (Invested) show a month and year list. No native browser date pickers anywhere.
• Saved message: a small dark toast bottom right ("Profile saved", "Task added for Sun 29 Nov"), gone after 4 seconds, with Undo where it makes sense.

## Order of work (one commit each)

1. Part A, items 1 to 8
2. Layout, errors, date menu, toasts everywhere (L1 to L5, R6 08)
3. Organisations: form fixes and new records (O1 to O11, R6 01, 02)
4. People: form fixes and new record (P1 to P9, R6 03)
5. Opportunities: board, card menu, record, convert (Q1 to Q9, R6 04, 05)
6. Mandates (M1 to M3)
7. Tasks (T1 to T8)
8. Intelligence, search, Ask AI, notifications (I1 to I4, S1 to S3, N1 to N3, R6 06, 07)
9. Settings, delete, overview (U1 to U7, D1 to D2, V1)

## When you finish

Send the preview link and, for every code above, Done or Not done (with why). List anything that needs design instead of inventing it. Don't merge.
