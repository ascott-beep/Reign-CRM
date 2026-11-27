# Reign Partners CRM

A purpose-built recruitment CRM for **Reign Partners**, a private-equity-focused
executive search firm. This is not a generic sales CRM: it models PE funds,
portfolio companies, and people who can simultaneously be candidates, client
contacts, investors, or referral sources — plus the distinct lifecycle of a
**business-development opportunity** converting into a **confirmed mandate**,
and the **per-mandate candidate pipeline** that runs underneath it.

## Stack

- **Next.js 16** (App Router, Server Actions, TypeScript strict)
- **PostgreSQL** via **Prisma 6** (migrations, `pg_trgm` for fuzzy search)
- **Auth.js v5** (credentials + JWT sessions, no external IdP required)
- **Tailwind CSS v4** with a centrally-configurable brand accent token
- Radix UI primitives (shadcn-style components), **dnd-kit** for kanban boards
- React Hook Form + Zod, TanStack Table, Recharts, date-fns
- **Vitest** (unit/integration) and **Playwright** (E2E)

## Getting started

### 1. Database

```bash
docker compose up -d          # Postgres 16 on localhost:5432
cp .env.example .env
```

Edit `.env` if you're not using the docker-compose defaults. At minimum, set
`AUTH_SECRET` (generate with `npx auth secret`).

### 2. Install, migrate, seed

```bash
npm install
npm run db:migrate:deploy     # applies committed migrations
npm run db:seed               # fictional Reign Partners demo data
npm run dev                   # http://localhost:3000
```

Seeded logins (password from `SEED_USER_PASSWORD` in `.env`, default `ChangeMe123!`):

| Email                    | Role     |
| ------------------------ | -------- |
| `adam@reign.partners`    | Admin    |
| `yagmur@reign.partners`  | Standard |

There is no seeded Read-Only user by default — create one from **Settings →
Users** (Admin only) to exercise that role.

### 3. Everyday commands

| Command                      | Purpose                                                  |
| ----------------------------- | --------------------------------------------------------- |
| `npm run dev`                  | Start the dev server                                       |
| `npm run build` / `start`      | Production build / run                                     |
| `npm run typecheck`             | `tsc --noEmit`                                             |
| `npm run lint`                   | ESLint                                                     |
| `npm run db:migrate`              | Create + apply a new migration (dev)                        |
| `npm run db:migrate:deploy`        | Apply committed migrations (CI/prod)                       |
| `npm run db:seed`                   | Re-run the demo seed (idempotent for taxonomies)              |
| `npm run db:reset`                   | Drop, re-migrate, and reseed the dev database                  |
| `npm run db:studio`                   | Prisma Studio                                                |
| `npm test`                             | Vitest (unit + integration)                                  |
| `npm run test:e2e`                      | Playwright E2E (needs a running app + seeded database)          |

## Deploying (Vercel)

The build command runs `prisma migrate deploy` before `next build` (see
`package.json`'s `build` script), so every deploy — production or preview —
applies any migrations committed in `prisma/migrations/` that aren't already
recorded as applied, before the app builds. `migrate deploy` is non-
interactive and only ever applies forward; it never resets or drops data.

**Before this takes effect anywhere, every existing database this app talks
to (production, and preview if it's separate) needs a one-time baseline
check.** `migrate deploy` tracks what it's applied in a `_prisma_migrations`
table it manages itself; if a database was ever set up by another route —
`prisma db push`, a restored dump, hand-run SQL — that table won't exist or
won't list migrations that are nonetheless already reflected in the schema.
`migrate deploy` then refuses outright (`P3005: database schema is not
empty`), which would turn the next deploy into a hard build failure instead
of the silent 500s this is meant to fix. The dev database in this repo's own
history had exactly this gap. Check and fix it once, per database, **before**
relying on the automatic step:

```bash
# 1. Back up first — always, before touching migration state.
pg_dump "$DATABASE_URL" -F c -f "pre-baseline-$(date +%Y%m%d%H%M%S).dump"

# 2. From a checkout with every migration folder in prisma/migrations/:
npx prisma migrate deploy
```

If step 2 fails with `P3005`, the database predates migration tracking and
needs baselining: confirm the existing schema actually matches what these
migrations would produce (it should, if nothing's drifted out of band), then
mark each migration folder as already applied, oldest first —

```bash
for m in prisma/migrations/*/; do
  name=$(basename "$m")
  [ "$name" = "migration_lock.toml" ] && continue
  npx prisma migrate resolve --applied "$name"
done
```

— then re-run `npx prisma migrate deploy`, which should now report "No
pending migrations to apply." From here on, both the manual command and the
automatic build-time step stay in sync for that database.

**Preview deployments must use their own database, not production's.** If
every Vercel environment points at the same `DATABASE_URL`, a preview build
will run `migrate deploy` against production the moment it's pushed — before
anyone's reviewed the change. Check this in Vercel → Project → Settings →
Environment Variables: compare `DATABASE_URL` under the Production and
Preview tabs. If they're identical, set up an isolated preview database:

- **Easiest:** install the official **Neon** integration from the Vercel
  Marketplace, connect it to this project's Neon project, and enable
  "Create a branch for each preview deployment." Vercel then injects a
  per-preview `DATABASE_URL` pointing at a disposable Neon branch — no
  further env var wiring needed, and nothing a preview build does can touch
  production. A fresh branch cut from production inherits its migration
  history too, so it won't need baselining separately.
- **Manual alternative:** create a Neon branch yourself (instant
  copy-on-write, from the Neon console), then add a `DATABASE_URL` in Vercel
  scoped to the **Preview** environment only, pointing at that branch's
  connection string, distinct from the Production-scoped one.

It prints each migration it applies (or reports none pending). Restore from
the dump with `pg_restore -d "$DATABASE_URL" <file>` if anything looks wrong
afterwards.

## Testing

**Unit/integration** run against a separate database so they never touch your
demo data:

```bash
createdb reign_crm_test   # once
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reign_crm_test?schema=public" \
  npx prisma migrate deploy
npm test
```

**End-to-end** (Playwright) runs against a real dev server and a freshly
seeded database, since several scenarios (confidentiality, off-limits,
duplicate detection) depend on specific seed fixtures:

```bash
npm run db:reset && npm run db:seed
npm run dev &
npm run test:e2e
```

Nine scenarios are covered: authentication, organisation creation + fuzzy
duplicate detection + relationships, candidate profile + employment history,
opportunity → mandate conversion, the full candidate pipeline (add → stage
changes → interview → offer → placement), task creation/completion, global
command-palette search, and confidentiality enforcement (a highly-confidential
mandate is hidden from a standard user who isn't its owner or assignee, both
in list views and via direct URL).

Playwright E2E tests create real records; re-running the suite repeatedly
against the same database will accumulate test data. `npm run db:reset &&
npm run db:seed` between runs keeps things clean — this is what CI should do.

## Architecture notes

- **Organizations** is one table for both PE funds and portfolio companies,
  distinguished by `type` plus a many-to-many `OrganizationRelationship` join
  table (never a single `fundId` on a company — co-investment and exits are
  first-class).
- **People** is one table with a many-to-many `personTypes` array; a person
  can be a candidate, a client contact, and an investor contact
  simultaneously. Candidate-specific fields live in a separate
  `CandidateProfile` extension table, not on `Person`.
- **Opportunities** (early BD) and **Mandates** (confirmed, fee-bearing
  engagements) are distinct entities. Converting a Won opportunity to a
  mandate is a single DB transaction that preserves a backlink
  (`Mandate.sourceOpportunityId`).
- Candidate progress is tracked **per mandate** via `CandidateProcess` — a
  candidate can be in different stages on different mandates simultaneously.
  Stage transitions write immutable `*StageHistory` rows.
- Money fields are `Decimal`, never `Float`. Prisma `Decimal` values are
  serialized to strings before crossing the Server → Client Component
  boundary (React Server Components can't pass Decimal instances directly).
- All protected mutations re-check permissions server-side (see
  `src/lib/permission-rules.ts`, deliberately framework-free so it's
  unit-testable without pulling in Next.js/Auth.js). Highly-confidential
  mandates are filtered via `mandateVisibilityWhere()`, applied consistently
  across list pages, detail pages, and search.
- Records are archived (soft-deleted), never hard-deleted, from the normal UI.

### Deliberate version pins

- **Prisma 6.19**, not 7 — Prisma 7 requires driver adapters and a
  `prisma.config.ts` migration that was out of scope for this build; 6.x is
  stable and fully supported.
- **TypeScript 5.9**, not the TS7 native rewrite — `typescript-eslint`'s
  parser doesn't yet support it.

## Known limitations

- **Branding**: `reign.partners` was unreachable from the build
  environment's network policy, so the exact brand colours/logo could not be
  retrieved. The UI uses a neutral, restrained PE-firm palette with a single
  configurable accent (`Workspace.brandAccent`, `#1C2B4A` placeholder),
  editable centrally in `.env` or **Settings → Workspace**. Swap in the real
  brand accent (and a logo asset) once available — no other code changes
  needed.
- **File storage**: defaults to local disk (`STORAGE_PROVIDER=local`) for
  zero-config local development. Set `STORAGE_PROVIDER=s3` and the `S3_*`
  variables for a production deployment — local disk storage does not survive
  redeploys on most hosting platforms, and Next's build tracer will bundle the
  whole project if the local storage path resolves dynamically at build time
  (harmless in dev, worth switching to S3 before shipping).
- **CSV import** is a single-page upload-and-map flow with row-level
  validation reporting, rather than a multi-step wizard with a separate
  column-mapping screen — functionally complete but less guided.
- No external identity provider (SSO/SAML) is wired up; Auth.js is configured
  with a Credentials provider only.

## Environment variables

See `.env.example` for the full annotated list (database, Auth.js, workspace
defaults, seed behaviour, file storage). Nothing is required beyond
`DATABASE_URL` and `AUTH_SECRET` to run locally against docker-compose.
