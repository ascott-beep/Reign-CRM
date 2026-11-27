

## 9. Additions (26 Nov 2026): delete, users, currencies, login, placeholders

New reference files: screens 12–15 and dialogs d11–d13. Screen 04 (mandate record) is updated with a "⋯" More button at the end of the header actions.

### 9.1 Placeholder text (applies everywhere)
- Every text input that shows an example uses "e.g." in muted text: "e.g. hannah@reign.partners", "e.g. Hannah", "e.g. £55,500".
- Placeholders are examples only, never instructions. The label above the box says what it is; a hint under the box explains anything else.
- Go through every existing form (create/edit mandate, opportunity, person, organisation, task, activity, settings) and apply this.

### 9.2 Login (15-login)
- Always white background in both themes, full navy Reign logo (docs/redesign/reign-logo.svg) at 150px wide, centred.
- Title "Sign in", subtitle "Reign CRM". Email (placeholder "e.g. adam@reign.partners"), Password with Show/Hide, "Forgot password?" link, full-width navy Sign in button, footer line "Reign Partners · Executive search for private equity".
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
