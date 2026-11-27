# Atlas (Reign CRM): Round 2 brief

Everything agreed on 26–27 November 2026, after the Phase 1–10 build and the first QA. Work through it top to bottom.

## How to work
- Branch `redesign-round-2` from `redesign-fixes-1`. One commit per numbered section below. Push for a Vercel preview after each section. Don't merge anything into `main`.
- Follow the existing design system: `docs/redesign/tokens.css`, `tailwind.reign.ts`, the reference screens in `docs/redesign/screens/` and `SPEC.md`. Where a screen below has no reference design yet, build it in the same style; Adam and Claude will review and send fixes.
- Keep plain English everywhere: one status per row, verbs first for actions, no codes.
- Database: back up before any change, migrations additive only, never drop or rename existing data. The Vercel build must run `prisma migrate deploy` so migrations can't be missed again.
- Goal for the whole round: the CRM must feel super intuitive. A new consultant should be able to log a call, move a candidate and see what's due without being shown how.

---

## 0. Confirm the QA fixes are done (from redesign-fixes-1)
Confirm each of these, and tell me anything that isn't done:
- Every page loads: /mandates, /mandates/[id], /opportunities, /opportunities/[id], /people, /people/[id], /organisations, /organisations/[id], /intelligence, /reports (all returned 500 because migrations weren't applied). Say whether previews share the production database. If they do, give the steps to set up a separate preview database (e.g. a Neon branch).
- `/api/cron/purge-archived` only purges records deleted through the new Delete flow (`archivedById` not null AND archived on or after the date this ships), never records archived by the old app (merged duplicates etc.). It has a dry-run mode that logs what it would delete, and stays in dry-run until Adam says otherwise.
- Overview fits 1440×900 with no vertical scroll.
- Overview: hide the "0 new" badge on Market signals when there's nothing new; Market signals tags stay on one line (short labels); Live mandates client lines stay on one line with an ellipsis.
- Settings → Users matches `12-settings-users`: table inside a card, avatars, role as text, status as a chip (Active / Invited / Deactivated), "⋯" row menu (Change role, Resend / Cancel invite, Send password reset, Deactivate / Reactivate, Reassign open work), no inline dropdowns or toggles, sentence-case column headers, "Users" section title with the "n people · n admin · n invite waiting" line.
- Login is always light, even when the computer is in dark mode (SPEC 9.2). Google and Microsoft buttons stay hidden until their env vars exist.

## 1. Sizing and breathing room (every page and pop-up)
Adam's screenshots showed controls of different heights side by side ("All types" select vs "Log signal"; the "Mine / Team" toggle vs "New task"; the top bar's mixed sizes). Fix it with one system, everywhere:
- **Toolbar controls** (buttons, selects/dropdowns, segmented toggles, search, filter buttons, icon buttons): 36px tall, 6px radius, 14px horizontal padding, 16px icons, 8px icon–text gap, 13px text. Icon-only buttons are 36×36.
- **Segmented toggles** (Mine/Team, Board/List, theme etc.): same 36px height and 1px border as buttons; the selected option is an inset pill (3px inset, 4px radius), not a block of a different size.
- **Form inputs in dialogs:** 40px tall, 6px radius. Login keeps its own sizes (SPEC 9.2).
- **Gaps:** 8px between related controls, 12px between groups, 24px between page sections.
- **Page:** 32px top padding, 40px sides. **Cards:** 20–24px padding. **List rows:** at least 48px.
- **No separate top header bar.** The desk picker, notifications, search and Quick create sit in each page's header row, vertically centred with the page title, as in `01-overview`.
- Nothing cramped: text never touches a container edge, nothing wraps awkwardly, labels and chips stay on one line.
- Add an automated UI check (Playwright) that loads every page in light and dark at 1440×900 and fails if any toolbar control isn't 36px tall, any page scrolls horizontally, or the Overview scrolls vertically.

## 1b. Atlas branding across the CRM
- Use the Atlas logo from the login page (Reign mark + the word "Atlas", `docs/redesign/atlas-logo.svg`) as the logo everywhere in the app.
- Sidebar, expanded: the Atlas lockup in place of the Reign logo, same height as the current sidebar logo, left-aligned with the nav items. Collapsed: the Reign mark only.
- Light mode: navy. Dark mode: white (#e9eef4). Use `currentColor` so it follows the theme.
- Browser tab title "Atlas" (e.g. "Mandates · Atlas"), and the favicon is the Reign mark.
- Anywhere the app name appears in the UI or emails (invites, password resets), say "Atlas", e.g. "You've been invited to Atlas".

## 2. Opportunity → mandate connection
Keep two pipelines: **Opportunities** (approaching businesses to win a role) and **Mandates** (delivering the roles won). They must feel like one journey:
- **Won is one quick step.** Clicking Won on an opportunity opens a short dialog: fee, start date, lead consultant. Everything else carries over automatically to a new mandate: client, role, contacts, notes, files and activity history. The new mandate then opens on its Brief.
- **Each side links to the other.** The mandate header shows "Won from: <opportunity> · <date> · <fee>" (linked). The won opportunity shows "Now a live search: <current stage> →" (linked).
- **Opportunities board:** cards in Won show the mandate's current stage, so you can see what each win became.
- **Organisation page:** shows both its open opportunities and its live mandates together.

## 3. Opportunity and mandate record pages (Pipedrive style)
Apply this to the opportunity record and the mandate record only. Other pages stay as designed.
- **Header:** title, client, a stage progress bar showing the current stage and days spent in each stage, and the main outcome buttons (opportunity: Won / Lost; mandate: Mark filled / On hold), plus the "⋯" menu (Delete etc. from SPEC 9.3).
- **Left sidebar:** key facts only (opportunity: company, contact, fee, owner, expected close; mandate: client, fee, lead consultant, start date, "Won from" link). Everything else goes under "More details" (see section 9).
- **Main column, in this order:** composer, then Focus, then History. Mandates keep their Candidates tab next to the activity view.
- **Hover cards:** hovering a person, company or user name shows a small preview card.

## 4. Activity logging (the Pipedrive way)
**Composer** at the top of the main column, with tabs **Activity · Note · Email · File**:
- Activity type icons: Call, Meeting, Task, Email, Deadline.
- Subject fills itself ("Call Rebecca Nash") and stays editable.
- Date and time with quick chips: Today, Tomorrow, Next week, Pick a date. Duration for meetings.
- "With" picker: the record's contacts and, on mandates, its candidates.
- Notes box.
- "Mark as done" tick, so the same box logs something that already happened instead of scheduling it. Done calls get an outcome: Connected / Voicemail / No answer.
- Email tab sends through the user's connected mailbox (section 7).

**Focus** (under the composer): overdue and upcoming activities for this record, each with a tick box, plus pinned notes.

**"What's next?" pop-up.** Ticking any activity as done (on a record, on Tasks, or in Home's Today list) opens a small pop-up:
- "✓ <activity> done"
- For calls: optional outcome (Connected / Voicemail / No answer) and a one-line note.
- Next activity: type pre-selected (same as the one just done), subject pre-filled ("Follow up with Rebecca Nash"), quick dates (Tomorrow, In 3 days, Next week, Pick a date), same person by default.
- Buttons: **Save next step** (primary; Enter) and **No next step** (Esc). Choosing No next step leaves the record with no planned activity, so its status dot turns grey.

**History** (below Focus): everything newest first with type icons, plus filter chips All · Activities · Notes · Emails · Files · Changes ("Changes" = stage moves and field edits).

**Where activities show up:**
- An activity logged on an opportunity or mandate also appears on the linked person's history, the company's history, and in Tasks.
- On mandates, an activity can be tied to a candidate and then also shows on that candidate's row.
- **Status dots on board cards come from the next activity:** red = overdue, green = due today or later, grey = nothing planned.

## 5. Intelligence: AI web research agent
- **Watchlist:** priority organisations, tracked PE funds and their portfolio companies, and any company with an open opportunity or mandate. Adding a company to Atlas adds it automatically.
- **Daily sweep:** a Vercel cron at a time set in Settings. For each company, use the Claude API with web search to review all web sources: news, press releases, company websites, PE fund announcements, deal sites, job postings (e.g. "hiring a CFO") and public filings found on the web. Read the sources, not just headlines. No Companies House integration.
- **Only relevant events become signals:** finance leadership changes, fundraises, acquisitions, exits, new PE ownership, restructuring, finance job postings, growth or distress signals. Each signal has a one-line summary, type, confidence and every source link. Merge duplicates (same story, several outlets) into one signal with several sources.
- **Provider interface:** build research behind an interface so Grok (xAI API) can be added later as a second provider without changing anything else.
- **Review queue:**
  - **Accept**: files the signal against the company and any person mentioned; it shows on the company's history and in Home's Market signals.
  - **Accept & create opportunity**: opens a pre-filled opportunity (company, likely role, e.g. "CFO · Pinnacle Energy") with the signal attached as the reason.
  - **Add company** first if the company isn't in Atlas yet.
  - **Dismiss** with a reason: Not relevant / Wrong company / Already knew. Dismiss reasons feed back into the agent's instructions so it learns what to skip. Dismissed items stay under a "Dismissed" filter for 30 days, then disappear.
- **"Research now"** button on each company page runs the agent for that company immediately.
- Log every run, its sources and its cost. Settings controls the sweep time and which signal types to include.
- The Intelligence page shows signals only; all source and connection settings move to Settings → Connections.

## 6. Settings → Connections
One page listing every connection, each with status, last run or sync time, what it pulls in, and an on/off switch:
- AI research: Claude (Grok shown as "coming soon"), with sweep time and signal types.
- Outlook (Microsoft 365) email, Gmail email.
- Outlook calendar, Google calendar.
- Google and Microsoft sign-in status (from SPEC 9.2).
Each user connects their own mailbox and calendar here. Hide each connection's controls behind its env vars until they exist, like the sign-in buttons.

## 7. Email and calendar sync (Outlook and Gmail)
- Each user connects their own mailbox: Outlook through Microsoft Graph, Gmail through the Gmail API (OAuth, reusing the same Microsoft and Google apps as sign-in). Store tokens encrypted.
- **Only matching emails are synced.** If a from/to/cc address matches a Person in Atlas, the email is stored. Nothing else is stored. Never sync emails that are only between @reign.partners addresses. Each user has a "never sync" list.
- **Where a synced email shows:** that person's history, their current company's history, and any open opportunity or mandate where they're a contact or candidate.
- **Private flag** per email: other users see "Email with <name>" without the content.
- **Sending:** the composer's Email tab sends through the user's own mailbox, so it lands in their Sent folder; replies thread back into Atlas.
- **Calendar:** meetings with matched people log themselves as Meeting activities, which feeds the status dots.
- Use change notifications (Graph subscriptions, Gmail push) with a 5-minute polling fallback.
- Google Workspace note: set the Google app as internal to the organisation so Gmail access avoids Google's external app review.

## 8. Ask Atlas (built-in AI search)
- The ⌘K search bar takes names or questions. A name jumps to the record; a question opens an answer panel.
- Answers come from the Claude API using read-only tools over Atlas data (search people, organisations, opportunities, mandates, candidate processes, activities, notes), permission-checked as the current user. Every record named in an answer is a link. Use web search only for questions about the outside world (e.g. "What's Oakfield's ownership?"), and say when it was used.
- An "Ask" button on opportunity, mandate, person and company records with suggested prompts: Summarise, What's the latest, Who could fit this role.
- Example questions it must handle: "Which CFOs have we spoken to in logistics in the last 6 months?", "Who's interviewing for the Bracken role and what's outstanding?", "Find finance directors who've worked at PE-backed consumer brands."
- Read-only. Ask Atlas never changes data. (Later it could draft emails or create tasks, always with a Confirm step. Don't build that yet.)
- Leave people marked do-not-contact out of candidate suggestions. Log every question. Admins can switch Ask Atlas off in Settings.
- Phase 2 (don't build yet): semantic search inside notes, CVs and emails using pgvector.

## 9. Simplify (make it intuitive without changing the pipelines or stages)
- **Short create forms:** opportunity = company, role, estimated fee; mandate = client, role, fee; person = name, email or phone, current company; organisation = name, type. Everything else is filled in on the record afterwards. Keep the "e.g." placeholders (SPEC 9.1).
- **"More details":** records show only key fields. All other fields (ownership, investor strategy, sectors, practice areas, functional specialisms, custom fields, off-limits, confidentiality etc.) sit under a "More details" expander, closed by default.
- **Settings order:** Users, Connections, Currencies and Recently deleted at the top. Everything else (Workspace, Pipeline stages, Lists and tags, Custom fields, Stale thresholds, Imports, Audit log) goes under "Advanced".
- **Money wording:** Home and the boards say "Likely fees" instead of "Weighted pipeline" (same maths). Stage probabilities show only in Reports.

## 10. Not in this round (don't build)
- Bulk actions on lists (designs to follow).
- Mandate Brief, Interviews, Offer and Fees tab redesigns (designs to follow; keep the current content restyled).
- Cutting candidate stages or merging menu sections.
- Xero invoicing, semantic search (Ask Atlas phase 2), Grok provider.

## When done, give Adam
- The preview link.
- Every env var he needs to add in Vercel, and step-by-step setup for: the Claude API key, the Microsoft app (sign-in, Outlook email and calendar), the Google app (sign-in, Gmail and calendar), and the cron secret.
- Anything you couldn't match or decided yourself.
- Every database change and how to roll it back.
