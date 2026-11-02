# Bench Tool

Bench staffing viewer. Ingests an Excel export of resource data into Postgres and presents it as a filterable bench dashboard, a skills search, and an AI staffing assistant that recommends candidates for a role brief.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4, Prisma 7 on Postgres, exceljs, TanStack Table, Recharts, Vitest.

## Local setup

1. Create a Postgres database and a `.env` file:

   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/bench
   AUTH_SECRET=<long random string>
   ```

2. Install, migrate, seed, run:

   ```powershell
   npm install
   npx prisma migrate deploy
   npm run seed        # ingests data/UpdatedView.xlsx (override with SAMPLE_XLSX=path)
   npm run dev         # http://localhost:3000
   ```

3. Create a user (see below), then sign in.

Other commands: `npm test`, `npm run lint`, `npm run build`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Signs the session JWT (HS256, 7 days) |
| `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` | AI assistant via Azure OpenAI (used when the endpoint is set) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Fallback AI provider when Azure OpenAI is not configured |

## Deployment

Pushing to `main` runs `.github/workflows/main_bench-boost.yml`: install, `prisma generate`, build, test, then deploy the artifact to the `bench-boost` Azure Web App. `npm start` runs `prisma migrate deploy` before starting Next.

## Users

There is no self-service signup. Every `User` account is an admin: admins can upload, use the AI assistant, add notes and open `/admin`. Admin accounts are created with the SSH script on the App Service (it inserts a `User` row with a bcrypt-hashed password); emails are stored lowercase. SSO is planned to replace password login.

Viewers sign in with a shared password set on `/admin` and can only see the bench and skills pages. Changing or disabling the password signs out existing viewers within about 30 seconds. Viewer access is off until an admin sets a password.

## Layout

```
app/                 pages (/, /skills, /ai, /auth/login) and API routes
components/          Dashboard, SkillsSearch, AIAssistant, detail dialog, charts
lib/snapshotLoader.ts  cached latest snapshot: slim list DTO for pages, detail DTO per resource
lib/excel/           workbook parsing and availability bucketing
lib/ai/              prompt building and the chat-completions client
prisma/              schema and migrations
```

The latest snapshot is cached in memory per snapshot id, so page loads only hit the database to check for a newer snapshot. Per-resource details load on demand from `/api/resources/[id]`.
