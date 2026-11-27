# Atlas · Round 4 build brief

Everything in this round has a finished design. The pictures are in `docs/redesign/screens/round4/` (light and dark for each). The live design canvas is the "Round 4 · designs" page of the Reign Dashboard Redesign artifact.

## Ground rules (apply to everything, now and later)

1. **Nothing is built without a design.** If you need a screen, panel, pop-up, empty state or message that is not in `screens/round4/` or an earlier screens folder, stop and list it under "Needs design" in your summary. Do not invent UI.
2. **No em dashes or en dashes anywhere in the product.** Not in labels, messages, emails, placeholders, empty cells or seed data. Use a middle dot (·), a comma, or the word "to". An empty value is left blank. Add a check (a test or lint step) that fails if `—` or `–` appears in `src/` or in any user-facing string.
3. **Match the pictures.** Inter Tight. Toolbar controls 36px tall, form fields 40px, chips 28px, new parts use 6px corners. Use the existing colour tokens, plus three new ones for anything AI:
   - light: `aiBg #eef7ff`, `aiLine #cfe5f8`, `aiIcon #1d5f99`
   - dark: `aiBg #0f2540`, `aiLine #1f4469`, `aiIcon #bae1ff`
4. **Plain English.** Sentence case labels, no uppercase field labels, buttons say what they do ("Delete mandate", never "OK").
5. **Dates and times in UK time** (Europe/London) everywhere, formatted on the server and client the same way.
6. **Money** always shows its currency and thousands separators as you type (£38,000). Only GBP, USD, EUR and AED.
7. **Safety:** work on a new branch from `round-3`. One commit per section below. Deploy a preview (it uses its own Neon branch). Do not merge to main. Keep the purge job in DRY_RUN.

## Part A · Fixes from the round 3 QA (do these first)

1. **Screens don't update after an action.** After every create, edit, delete, stage move, Won, Lost or log, refresh the data on screen (`revalidatePath` on the server action plus `router.refresh()` where needed). Delete from a record goes back to the list, shows the Undo toast, and the list and sidebar counts update straight away.
2. **Won must carry everything across.** When an opportunity is won, the new mandate gets the client contacts, the full activity history, notes and files, and open activities move to the mandate. The opportunity keeps a read-only copy and a link (see `R4OppWon`).
3. **Won changes nothing until confirmed.** Pressing Won only opens the pop-up (`DlgR4Won`). Cancel or Esc leaves the opportunity exactly as it was.
4. **Stage names must match Settings.** Use the names from Pipeline stages everywhere (Brief, Searching, Shortlist, Interviews, Offer, Placed). Remove "Brief Received", "Search Active" and any other hard-coded labels.
5. **React error #418 (hydration).** Caused by dates formatted differently on server and browser. Format all dates in Europe/London with one shared helper.
6. **Small fixes:**
   - "Mark as done" tick box is invisible in dark mode. Give it a visible border in both themes.
   - Recently deleted must match its design (`R4SetDeleted`).
   - Show the user's full name in the sidebar footer.
   - Add `aria-label`s to the progress steps and the tick boxes.
   - Money inputs format with currency as you type.

## Part B · Sidebar and global changes

- **Ask AI bar** replaces the search box at the top of the sidebar: sparkle icon, "Ask AI" then muted "or search", light blue AI colours. No ⌘K badge on the bar. ⌘K still opens it and the tooltip reads "Ask AI or search (⌘K)".
- Under it: **+ New** (navy, fills the width) and a 36px **bell** button with an orange dot when there are unread notifications.
- Remove the bell and Quick create buttons from the Overview header.
- On Overview, "Weighted pipeline" is renamed **Likely fees**.
- Logo: Atlas mark plus "Atlas" word, no underline.

## Part C · Every design, with how it works

The numbers match the picture file names.

### Everywhere · Ask AI, New, notifications, messages, states

**01 · Ask AI · opened from the sidebar** (`01-R4AskOpen-light.png` / `-dark.png`)

• The sidebar "Ask AI or search" bar opens this panel (⌘K still works; it shows only in the tooltip, never on the bar).
• Empty state: 4 suggested questions based on where you are (on a mandate, they are about that mandate), then 3 recent records.
• Typing a name shows record matches (see "Search results"); typing a question shows "Ask AI" first.
• 680px wide, 10px radius, sits 88px from the top, centred on the content area. Scrim behind.

**02 · Ask AI · answer** (`02-R4AskAnswer-light.png` / `-dark.png`)

• The answer streams in under the question. Plain English, short. Every record named is a link (underlined in the light AI blue).
• Supporting records appear as rows below the text, with status tags matching the rest of Atlas.
• "Sources" lists what it read. If it used the web, say "and 2 web pages" and link them.
• Follow-up box keeps the conversation going in the same panel. Copy button top of the footer.
• Small disclaimer line under every answer. Read-only: Ask AI never changes data.

**03 · Search results while typing** (`03-R4SearchResults-light.png` / `-dark.png`)

• Typing a name shows matches grouped by type: Organisations, Opportunities, Mandates, People. Matched text in medium weight.
• First row is always "Ask AI about …" so you can turn any search into a question.
• Duplicates are flagged inline. Tab cycles a type filter. Enter opens the highlighted row.
• Never show "No results" next to the Ask AI row. With no matches, show only the Ask AI row and "No records match".

**04 · New menu** (`04-R4NewMenu-light.png` / `-dark.png`)

• Opens under the "+ New" button in the sidebar. 240px, 38px rows, icon + label + single-key shortcut.
• Each item opens the short create form (or the Log activity composer as a pop-up).
• Import sits under a divider, as a less frequent action.

**05 · Notifications** (`05-R4Notifications-light.png` / `-dark.png`)

• Opens from the bell next to "+ New". The bell shows an orange dot when anything is unread.
• Unread rows have a faint background and an orange dot. Clicking a row opens the record and marks it read.
• Filters: All, Unread, Assigned to me. "Mark all as read" top right. Settings link at the bottom.
• Types: research signals, interview reminders, assignments, logged emails, invites accepted.

**06 · Messages after an action (toasts)** (`06-R4Toasts-light.png` / `-dark.png`)

• Bottom right, 400px, stack upwards with 10px gaps. Max 3 at once.
• Undo (navy): after delete, archive, stage change and "No next step". Stays 8 seconds; hovering pauses the timer.
• Success (white, green tick): after saves that change something off-screen. Stays 4 seconds. Action link optional.
• Error (white, orange alert): never auto-hides. "Retry" repeats the action.
• Every server action must also refresh the page data immediately, so the screen never needs a manual reload.

**07 · Loading, empty and error states** (`07-R4States-light.png` / `-dark.png`)

• Skeletons (grey bars in the shape of the content) for anything loading. No spinners, no "Loading…" text.
• Empty states: icon, one-line title, one helpful sentence, one action.
• Section errors stay inside the card. Pop-ups show a skeleton of their own fields while loading.
• 404 and 500 pages use the same layout (500 says "Something went wrong on our side" with "Try again").


### Opportunity and mandate records

**08 · Opportunity record** (`08-R4OppRecord-light.png` / `-dark.png`)

• Header: title, stage tag, company link, fee, owner. Actions: Won (primary), Lost, ⋯ (Edit, Ask AI, Delete). Max 3 visible.
• Progress bar: click a step to move stage (confirm pop-up). Each step shows days spent; the current one says "so far".
• Left: Key facts (7 rows max) and "More details" (closed by default).
• Main: tabs Activity · Documents · Audit. Activity = composer, then "Next up" (open activities and pinned notes), then History grouped by day with filter chips.
• Composer: tabs Activity · Note · Email · File. Activity types as 32px toggles. Subject fills itself. "With" picker, quick dates, time. Tick "Already happened" to log instead of schedule; the button label follows ("Schedule call" / "Log call").

**09 · Opportunity record · won and locked** (`09-R4OppWon-light.png` / `-dark.png`)

• Green banner: when it was won, that it is now a live search, and the "View live search" button.
• No Won/Lost buttons, no composer and no stage changes. The progress bar is complete and not clickable.
• It leaves the Opportunities board (only visible under Closed, filter Won) and is excluded from Likely fees.
• Stage names always match the mandate's display names (Brief, Searching, Longlist, Shortlist, Interviews, Offer, Filled).

**10 · Mandate · Timeline** (`10-R4MandateTimeline-light.png` / `-dark.png`)

• Same composer, "Next up" and History as the opportunity. The "With" picker lists client contacts and candidates.
• Activities tied to a candidate say "candidate" and also show on that candidate's row in Candidates.
• Emails: subject, who it is from, a 2-line preview. Private emails show only "Email with <name>" and a lock line.
• Tabs: Timeline | Brief · Candidates · Interviews · Offer | Fees · Documents · Audit. Green tick on completed steps. No counts.

**11 · Mandate · Brief** (`11-R4MandateBrief-light.png` / `-dark.png`)

• Left: The role (summary, context, must-haves, nice to have, how we will assess). Each card has an Edit link that edits in place.
• Right: Terms (signed and brief sign-off with dates, fee basis, instalments with Paid / Invoiced / Not yet) and Details.
• The Brief tab gets a green tick once terms are signed and the brief is signed off.

**12 · Mandate · Candidates** (`12-R4MandateCandidates-light.png` / `-dark.png`)

• Columns: Candidate, Where they are (one status), Progress (6 steps), Fit, Next step, row menu.
• Next step column is the widest (at least 260px) and wraps to 2 lines. Only the date turns orange when overdue.
• People taken off the search are hidden behind "Show". Clicking a row opens the candidate side panel.

**13 · Mandate · Interviews** (`13-R4MandateInterviews-light.png` / `-dark.png`)

• Upcoming and Past, each a card. Date block, candidate and round, time, place and who from the client.
• Status: Time proposed, Confirmed, Done, Cancelled. Feedback column: "After the interview", "Client feedback overdue" (orange), or the outcome.
• "Schedule interview" opens a pop-up with candidate, round, date and time, place or video link and client attendees, and adds it to calendars once connected.

**14 · Mandate · Offer** (`14-R4MandateOffer-light.png` / `-dark.png`)

• One card per candidate at offer: Verbal offer, Written offer, Accepted, Started, with dates (filled in green as they happen).
• Package and Guarantee cards. Guarantee shows the end date and a simple progress bar.
• If an offer is declined, show it greyed with the reason and keep the others above.

**15 · Mandate · Fees** (`15-R4MandateFees-light.png` / `-dark.png`)

• Four numbers: Total fee, Invoiced, Paid, Outstanding (orange when anything is overdue).
• Instalments table with one action per row: Mark invoiced, Record payment. Amounts in the mandate's own currency.
• A mandate with any invoiced fee can't be deleted (blocked pop-up d12).

**16 · Mandate · Documents** (`16-R4MandateDocuments-light.png` / `-dark.png`)

• Drop zone at the top, then the table. Type is a tag picked on upload (Job description, Terms, CV, Shortlist report, Other).
• Row menu: Download, Rename, Change type, Delete. CVs uploaded here also show on the person's record.

**17 · Mandate · Audit** (`17-R4MandateAudit-light.png` / `-dark.png`)

• Plain-English sentences, newest first: "Fee changed from 28% to 30%". Never raw field names.
• Read only. Filter chips can be added later (Stages, Fees, Files, Edits).

**18 · Ask AI on a record (side panel)** (`18-R4RecordAsk-light.png` / `-dark.png`)

• "Ask AI" in the ⋯ menu (and the A shortcut) opens a 440px side panel. The page stays visible behind it.
• Starter chips: Summarise, What is the latest, Who else could fit, Draft a client update (drafts open in the Email tab, never send on their own).
• Answers are short, list the facts that matter, and name their sources. Read only.


### Pop-ups

**19 · Win this opportunity** (`19-DlgR4Won-light.png` / `-dark.png`)

• Opens from Won. Nothing changes until "Win and create mandate". Cancel or Esc leaves the opportunity exactly as it was.
• Three fields only. Money is formatted with its currency (£38,000) as you type.
• The line at the bottom lists exactly what will move across, with real counts.

**20 · Move to Interviews?** (`20-DlgR4Stage-light.png` / `-dark.png`)

• Opens when a step on the progress bar is clicked. Shows from and to as tags, and an optional note.
• The button names the stage. Moving back works the same way. After confirming, the bar updates straight away and an Undo toast appears.

**21 · <span style="display: inline-flex; align-items: center; gap: 8px"><span style="color: var(--pos); display: flex"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg></span>Call with Nadia Hassan done</span>** (`21-DlgR4Next-light.png` / `-dark.png`)

• Opens whenever an activity is completed (record, Tasks, Overview). Calls ask how it went; other types skip that row.
• Next step: type pre-selected (same as the one just done), subject pre-filled, quick dates, time, same person.
• Enter saves, Esc is "No next step". Both close the pop-up and update the page immediately (no reload). "No next step" turns the card dot grey.

**22 · Log a signal** (`22-DlgR4LogSignal-light.png` / `-dark.png`)

• For things the team hears directly. Same shape as AI research signals, so both live in one list.
• Organisation search includes "Add new organisation" at the bottom.

**23 · Dismiss this signal** (`23-DlgR4Dismiss-light.png` / `-dark.png`)

• One reason, picked in one click. Dismissed signals stay under the Dismissed filter for 30 days.

**24 · Download data for Sam Ogilvie** (`24-DlgR4Gdpr-light.png` / `-dark.png`)

• From a person's ⋯ menu, admins only. Everything is included by default; untick to leave something out.
• Produces a readable PDF plus a spreadsheet (or JSON). Logged in the audit log.

**25 · Anonymise Laura Bennett?** (`25-DlgR4Anonymise-light.png` / `-dark.png`)

• For erasure requests about placed candidates. The button stays disabled until the box is ticked.
• Shows exactly what goes and what stays. Logged without personal data.


### Create and edit pages

**26 · New person** (`26-R4FormPerson-light.png` / `-dark.png`)

• Full page, one card, 760px wide. Two columns for short fields, one for long.
• Required fields say (required) in the label. Nothing else is required.
• Duplicate check runs on name and email as you type. Banner offers Open record or Not the same. It never blocks saving.
• Organisation is a search box. Typing a new name offers "Add Vantage Capital as a new organisation" at the bottom of the list.
• Type uses chips, not a dropdown.
• More details is closed by default: source, tags, custom fields, notes.
• Sticky footer: Cancel, Save and add another, Save person. Enter saves. Esc asks before discarding changes.
• After saving, open the new record and show a toast "Person added".

**27 · New organisation · filled by AI** (`27-R4FormOrg-light.png` / `-dark.png`)

• Research button (Ask AI style, light blue) reads the web and fills website, HQ, AUM, sectors and about.
• Every AI-filled field carries a small "Filled by AI" label until the user edits it.
• The banner says how many fields were filled and offers Clear. Nothing is saved until Save.
• Sources line in the footer, each a link.
• Money with currency, formatted as you type.

**28 · New opportunity** (`28-R4FormOpp-light.png` / `-dark.png`)

• Name suggests "Client · Role" from the fields below and updates until the user types in it.
• Stage as chips using the real stage names from Settings.
• Chance of winning is a short list (Low 25%, Medium 50%, High 75%), not free text.
• Asks for a first next step, so nothing is created without one.
• Right panel shows the likely fee live as fields change.

**29 · Edit mandate · More details open** (`29-R4FormMandateEdit-light.png` / `-dark.png`)

• Same layout as the create pages. Fields that cannot change after Won are shown locked with the reason underneath.
• More details opened: source, retainer split, tags, confidentiality, invoice currency.
• Footer counts unsaved changes. Leaving with unsaved changes asks first.
• Every saved change writes one line to Audit.


### Intelligence

**30 · Intelligence · to review** (`30-R4Intel-light.png` / `-dark.png`)

• One card per signal. Headline in sentence case, source and time, plain summary, linked records as chips, one suggested next step from AI.
• Buttons: the main one does the suggestion (create opportunity, update record, add reminder). Accept just files the signal against the linked records. Dismiss asks for an optional reason and moves it to Dismissed with Undo.
• Tabs: To review, Accepted, Dismissed. Count on To review matches the sidebar badge.
• Right: Research a company (type a name, Research now) and the Watching list.
• Signal log button opens the full list as a table (date, headline, source, records, outcome).
• Sources are all web sources (news, filings, LinkedIn, company sites). No Companies House specific UI.

**31 · Research now · result** (`31-R4IntelResearch-light.png` / `-dark.png`)

• Opens as a right-hand panel from Intelligence, an organisation record (Research button) or Ask AI.
• Short summary first, then findings, each with where it came from (number of sources, click to list them).
• Suggested next steps as tick boxes. "Do 2 selected" creates them and shows a toast with Undo.
• Save to organisation stores the summary on the organisation's Timeline as a note marked "From AI research".
• While it runs: show the sparkle and "Reading 14 sources" with a thin progress bar. Typically 10 to 30 seconds.


### Settings

**32 · Settings · My profile** (`32-R4SetProfile-light.png` / `-dark.png`)

• One page heading (Settings) and one section heading. No repeated "My profile" titles.
• Email is read-only with the reason underneath.
• Change password opens a small dialog: current password, new password, confirm. Same rules as Set new password.
• Time zone defaults to London. All dates in the app use it (fixes the #418 hydration error too).

**33 · Settings · Connections** (`33-R4SetConnections-light.png` / `-dark.png`)

• Grouped: AI, Email and calendar, What gets logged. Each row: icon, name, status chip, one line of plain detail, one button.
• Status chips: Connected (green), Not connected (grey), Coming soon (grey, button disabled), Needs attention (orange, "Reconnect").
• Grok shown as Coming soon.
• All times in UK time.
• Use official provider logos from the files in docs/redesign (google-g.png, microsoft.png). The icons here are placeholders.

**34 · Settings · Notifications** (`34-R4SetNotifications-light.png` / `-dark.png`)

• Each row has two switches: In Atlas (the bell) and Email.
• Saves as soon as a switch changes, with a small "Saved" toast.

**35 · Settings · Users** (`35-R4SetUsers-light.png` / `-dark.png`)

• Matches the earlier Users design with the new settings layout.
• Role is changed inline. Changing your own role away from Admin is blocked if you are the last admin.
• ⋯ menu: Resend invite, Reset password, Deactivate. Deactivate keeps their records and history.
• Invite user opens the invite dialog (DlgInviteUser).

**36 · Settings · Recently deleted** (`36-R4SetDeleted-light.png` / `-dark.png`)

• Same as design 14. Restore puts the record back with everything that was kept, and shows a toast with a link to it.
• "Gone for good on" is the purge date. The purge job stays in dry run until Adam turns it on.

**37 · Settings · General** (`37-R4SetWorkspace-light.png` / `-dark.png`)

• No brand colour picker. Atlas colours are fixed.
• Labels in sentence case (no uppercase labels).
• Only admins see Workspace pages. Others see You and nothing else.

**38 · Settings · Pipeline stages** (`38-R4SetPipeline-light.png` / `-dark.png`)

• Two lists, one per pipeline. Drag to reorder, pencil to rename.
• These names are the only source for stage labels everywhere (fixes "Brief Received" vs "Brief").
• Deleting a stage with records in it asks where to move them.

**39 · Settings · Lists and tags** (`39-R4SetLists-light.png` / `-dark.png`)

• Click a tag to rename, merge or delete it. The number is how many records use it.
• Saved lists are made from a filtered People or Organisations view with "Save as list".

**40 · Settings · Custom fields** (`40-R4SetFields-light.png` / `-dark.png`)

• Types: Text, Number, Money, Date, Choice, Yes or no, Person.
• New fields appear in More details on the create and edit pages, never in the main card.

**41 · Settings · Imports** (`41-R4SetImports-light.png` / `-dark.png`)

• Steps after choosing a file: 1 Match columns, 2 Check duplicates, 3 Import. Each step on its own screen with Back and Next.
• Undo import is available for 7 days.

**42 · Settings · Audit log** (`42-R4SetAudit-light.png` / `-dark.png`)

• Read only. Filters for person, record type and date.
• Each line is a sentence with a link to the record. Download as CSV from the ⋯ menu.


### Sign-in pages and emails

**43 · Forgot password** (`43-R4AuthForgot-light.png` / `-dark.png`)

• Same page as Sign in: logo, faint mark, dot grid, one white card.
• Always shows the "Check your email" page, whether or not the email exists, so it can't be used to find accounts.

**44 · Check your email** (`44-R4AuthSent-light.png` / `-dark.png`)

• Resend is limited to once a minute. After pressing it the link reads "Sent again".

**45 · Set new password** (`45-R4AuthNewPw-light.png` / `-dark.png`)

• Rules tick green as they are met. Save is enabled when all three are met.
• Saving signs you in and signs out every other session.
• Show password toggle (eye) inside each field.

**46 · Accept invite** (`46-R4AuthInvite-light.png` / `-dark.png`)

• Here Google and Microsoft sit above the form, because a new user has no password yet. On Sign in they stay below.
• Email comes from the invite and cannot be changed. Google or Microsoft must match it.
• Invite links last 7 days.

**47 · Link expired** (`47-R4AuthExpired-light.png` / `-dark.png`)

• Used for both reset and invite links. For invites the button reads "Ask Adam Whitfield for a new invite" and emails the admin.

**48 · Email · invite** (`48-R4EmailInvite-light.png` / `-dark.png`)

• Plain, one button, no images except the Atlas logo. Works in Outlook dark mode.
• Sent from atlas@reign.partners with reply-to set to the admin who invited.

**49 · Email · reset password** (`49-R4EmailReset-light.png` / `-dark.png`)

• Same template as the invite.

## Order of work (one commit each)

1. Part A fixes
2. No-dash check and clean-up across the app
3. Sidebar, Ask AI, search results, New menu, notifications, toasts, loading, empty and error states
4. Opportunity and mandate records (tabs, activity composer, next step after done, Won hand-off)
5. Pop-ups
6. Create and edit pages
7. Intelligence and Research now
8. Settings (new layout and all pages)
9. Sign-in pages and emails

## When you finish

Post a summary with: the preview link, what was built per section, anything you could not match to the design, and a "Needs design" list for anything you found that has no picture. Do not merge.
