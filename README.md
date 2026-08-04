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
