# Bench Tool

A web-based bench staffing viewer that replaces the current Power BI tool. Ingests an Excel export of resource data and presents it as a fast, filterable, searchable table with click-through profile views.

This repo currently delivers a **local proof-of-concept** that runs end-to-end on SQLite. AWS deployment + Azure AD SSO are scoped for **Phase 2**, after manager approval.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Database:** SQLite via Prisma 7 (better-sqlite3 adapter) — Postgres on RDS planned for phase 2
- **Excel parsing:** [exceljs](https://github.com/exceljs/exceljs)
- **Table:** TanStack Table v8
- **Tests:** Vitest

## Demo in 60 seconds

```powershell
npm install
npm run seed         # loads data/bench_sample_source.xlsx into dev.db
npm run dev          # → http://localhost:3000
```

You should see a snapshot dated 2026-01-03 with 584 resources, bucketed **4 Available / 50 Coming / 530 Not Available**.

Click a row → profile drawer. Click a bucket tile → filter. Type in the search box → filter by name. **Upload new file** → re-ingest a fresh Excel without touching the CLI.

## Tests

```powershell
npm test
```

12 tests cover every branch of `deriveAvailability` plus an integration test that loads the real sample workbook and locks the bucket counts.

## Project layout

```
app/
  page.tsx                       # server component, loads latest snapshot from db
  api/upload/route.ts            # POST .xlsx → ingest as a new snapshot
  layout.tsx, globals.css
components/
  Dashboard.tsx                  # client: filters, table, drawer, CSV export
  UploadButton.tsx               # client: posts to /api/upload, refreshes router
lib/
  db.ts                          # Prisma client singleton (better-sqlite3 adapter)
  format.ts, resourceDto.ts      # shared formatting + DTO types
  excel/availability.ts          # pure deriveAvailability(row) function
  excel/parse.ts                 # ingestExcelBuffer(buffer, source)
  excel/columns.ts               # required column names (validated on upload)
  generated/prisma/              # generated client (gitignored in phase 2)
prisma/
  schema.prisma                  # Snapshot, Resource models
  migrations/                    # 20260507_init
scripts/
  seed.ts                        # loads the sample workbook into the DB
__tests__/
  availability.test.ts           # unit branches
  parse.test.ts                  # integration vs the real sample
data/
  bench_sample_source.xlsx       # the sample export (676 source rows, 584 named resources)
```

## Three-bucket logic

`lib/excel/availability.ts` exposes a pure function:

```ts
deriveAvailability(input, now = new Date()) → { bucket, firstStaffableDate, weeksOut, unknown }
```

Rules, in priority order (first match wins):

| # | Trigger                                                                                                  | Bucket          |
|---|-----------------------------------------------------------------------------------------------------------|-----------------|
| 1 | `Detailed Status` = `Now Staffable`                                                                       | available       |
| 2 | `Detailed Status` = `Coming Staffable`                                                                    | coming          |
| 3 | `First Staffable Category` starts with `Resource Now Staffable`                                           | available       |
| 4 | `First Staffable Category` starts with `Resource First Staffable Day` AND date within next 8 weeks        | coming          |
| 5 | `Status` or `Detailed Status` = `Not Staffable`                                                           | not_available   |
| 6 | All status fields null                                                                                    | not_available, unknown=true |

> ⚠️ **The brief and the sample data disagreed on rule 4.** The brief expected ~5 "coming"; the literal rules produce ~50. We kept the literal interpretation — a Not-Staffable person whose first-staffable-date is 4 weeks out *is* coming-available in 4 weeks. If your manager wants the brief's count, gate rule 4 to only fire when status fields are null.

## Anonymous "headcount placeholder" rows

The sample workbook contains 92 rows with no name, no EID, no skills — only job family + metro city (e.g. *"Custom Software Engineering, Dublin"*). These are reserved-capacity slots, not real people. **The parser skips them** (rows without an EID or name are dropped). Total ingested: 584 of 676 source rows. If you decide capacity-planning placeholders should appear in the dashboard later, see the comment in `lib/excel/parse.ts` near the `if (!eid || !fullName) continue;` guard.

## Environment variables

| Var               | Default                | Purpose                                                                       |
|-------------------|------------------------|-------------------------------------------------------------------------------|
| `DATABASE_URL`    | `file:./dev.db`        | SQLite connection. Set in `.env`. Prisma resolves the path relative to project root. |
| `SAMPLE_XLSX`     | `data/bench_sample_source.xlsx` | Override the seed-script source file.                                |

A starter `.env` was created by `prisma init`. Real secrets (Azure AD, S3, etc.) come in phase 2.

## Manual upload

The dashboard's **Upload new file** button POSTs the chosen `.xlsx` to `POST /api/upload`. The route:

1. Validates content type (.xlsx only, ≤25 MB)
2. Calls `ingestExcelBuffer(buffer, "manual")`
3. Returns `{ ok, snapshotId, snapshotDate, resourceCount, bucketCounts }`
4. The client calls `router.refresh()` so the dashboard re-reads from the DB

Each upload creates a new `Snapshot` row keyed by `snapshotDate` from the file. The last 10 snapshots are retained; older ones are pruned.

## What's deliberately NOT in the v1 POC

These are scoped for Phase 2 (post-approval) and are noted only to make scope explicit:

- **Auth.** No login. Localhost demo. `app/api/upload/route.ts` is open to anyone who can hit the port.
- **S3 watched-folder ingestion.** No `/api/ingest-from-s3`, no Lambda, no SQS.
- **Azure AD SSO via NextAuth.** No Microsoft Entra ID provider, no role gating.
- **Dockerfile / AWS App Runner deploy.** Not packaged for cloud.
- **CV / SharePoint linking.** `cvUrl` field reserved on the Resource model, currently always `null`. The drawer shows "CV (coming soon)" disabled.
- **AI chatbot, self-service profile updates, supply-and-demand integration.** Out of scope per the brief.

## Phase 2 roadmap

When the POC is approved for cloud deployment, the work to add (in roughly the order it should be tackled):

1. **Azure AD via NextAuth.** Register an app in your Accenture tenant; set `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`. Add `ADMIN_EMAILS` allowlist for the upload route. Wrap pages + API routes in a session check via middleware.
2. **Switch DB to Postgres on RDS.** Change Prisma `provider = "postgresql"` and the adapter to `PrismaPg`. Re-run migrations. SQLite stays viable for local dev via the existing `better-sqlite3` adapter.
3. **S3 watched-folder ingestion.** Bucket layout: `incoming/` → `processed/` (success) or `failed/` (with error log). Trigger via S3 PUT event → Lambda → webhook `POST /api/ingest-from-s3` with `INGEST_WEBHOOK_SECRET` header. Reuses the same `ingestExcelBuffer(buffer, "s3")` already in `lib/excel/parse.ts`.
4. **Dockerfile + App Runner.** Standard Node 20 image, `next build`, `next start`. Seed step skipped in prod.
5. **CV via SharePoint.** Wire the `cvUrl` field to your SharePoint resolver.

## Troubleshooting

- **"No snapshot in the database yet."** Run `npm run seed`, then refresh.
- **Upload returns "missing required column(s)…"** The workbook header row doesn't match the 31 required column names in `lib/excel/columns.ts`. The error response lists exactly which are missing.
- **`prisma migrate dev` says "Loaded Prisma config from prisma.config.ts"** — that's normal. Prisma 7 moved the connection URL out of `schema.prisma` and into `prisma.config.ts`.
- **Dev server slow on first page load** (~13s). That's Turbopack compiling the dashboard route on demand. Subsequent loads are sub-second.
