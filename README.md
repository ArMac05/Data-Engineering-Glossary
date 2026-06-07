# Data Engineering Glossary

A daily-driver-quality glossary of data engineering terms — a portfolio piece and a learning project for the modern web stack (Next.js 16, TypeScript, Prisma, Supabase Postgres + pgvector, FastAPI, Gemini). The public site is read-only; a single admin curates terms, and an async pipeline enriches each one with AI-generated code examples, a plain-English clarification, a Wikipedia summary, and a vector embedding that powers semantic search.

See [ROADMAP.md](./ROADMAP.md) for the full spec, phase history, and decision log, and [docs/learning-log.md](./docs/learning-log.md) for the running record of lessons.

## Architecture

A pnpm monorepo with two deployables:

- **`apps/web`** — Next.js 16 (App Router) on **Vercel**. Public read-only site plus a single-admin panel. Talks to Postgres through **Prisma**; auth via **Supabase Auth** with an email allowlist.
- **`pipelines/enrichment`** — FastAPI (Python 3.12) on **Fly.io**. Exposes `/enrich` behind a shared-secret header; calls **Gemini** (generation + embeddings) and **Wikipedia**, then writes the results back to Postgres.

Data flow:

```
Browser ── Next.js (Vercel) ──▶ Supabase Postgres ◀── FastAPI (Fly.io) ◀── Gemini / Wikipedia
                   │                                       ▲
                   └──────── webhook (X-Webhook-Secret) ───┘
```

Publishing a term saves it via a Next.js Route Handler, which fires a fire-and-forget webhook. FastAPI returns `202` immediately and enriches in the background, writing `term_enrichments` + `term_embeddings`. The public term page then renders the enriched content.

## Prerequisites

- **Node 22** and **pnpm 11.4** — run `corepack enable` to use the version pinned in `package.json`.
- **Python 3.12** and **uv** — the enrichment service uses uv for its virtualenv + lockfile.
- A **Supabase** project (Postgres + Auth) with the `vector` extension enabled.
- A **Gemini API key**.

## Setup

```bash
git clone <repo-url> && cd Data-Engineering-Glossary
corepack enable        # pins pnpm from package.json
pnpm install           # installs all workspaces

# Web env — copy the template and fill in real values
cp .env.example apps/web/.env

# Pipeline env — it needs three of the same values
cat > pipelines/enrichment/.env <<'EOF'
DATABASE_URL="<pooled 6543 connection string>"
GEMINI_API_KEY="<your gemini key>"
ENRICHMENT_WEBHOOK_SECRET="<same value as in apps/web/.env>"
EOF

# Apply migrations, generate the Prisma client, seed starter data
pnpm --filter web exec prisma migrate deploy
pnpm --filter web exec prisma generate
pnpm --filter web exec prisma db seed
```

> **Connection strings matter.** `DATABASE_URL` is the **pooled** connection (port `6543`, `?pgbouncer=true`) used by the app at runtime; `DIRECT_URL` is the **direct** connection (port `5432`) used for migrations. Don't swap them — it's the most common setup mistake.

## Running locally

Two processes, two terminals:

```bash
# Terminal 1 — web app → http://localhost:3000
pnpm --filter web dev

# Terminal 2 — enrichment service → http://localhost:8000
cd pipelines/enrichment
uv run uvicorn app.main:app --reload --port 8000
```

With both running, publishing a term at `/admin` fires the webhook to `http://localhost:8000/enrich`, and you'll see structured JSON logs as it enriches.

## Running tests

```bash
# Web — unit (Vitest) and end-to-end (Playwright)
pnpm --filter web test
pnpm --filter web e2e

# Web — lint / types / format
pnpm --filter web lint
pnpm --filter web typecheck
pnpm format:check

# Pipeline — lint / format / types / tests
cd pipelines/enrichment
uv run ruff check && uv run ruff format --check && uv run mypy . && uv run pytest
```

CI (`.github/workflows/ci.yml`) runs the same checks on every push.

## Deploy

- **Web → Vercel.** Root Directory = `apps/web`. Set the env vars from `.env.example` (pooled `DATABASE_URL`, direct `DIRECT_URL`). Env-var changes only take effect on a **redeploy**.
- **Pipeline → Fly.io.** From `pipelines/enrichment`: `fly deploy --build-arg GIT_SHA=$(git rev-parse --short HEAD)`. Set secrets with `fly secrets set` (one per line). Runs as a single always-on machine so background enrichment isn't killed mid-run.
- **Migrations.** Apply with `prisma migrate deploy`. **Never** run `prisma migrate dev` against the shared production database — its drift detector can offer to reset it. Hand-author SQL for anything Prisma can't model (extensions, generated columns, RLS policies).
- **Health.** `GET /health` (Fly) and `GET /api/health` (Vercel) both return `{ status, build_sha, db_reachable }`.
- **Backups.** `.github/workflows/backup.yml` runs a daily `pg_dump` of the `public` schema to a GitHub artifact and verifies it restores into a throwaway database.

## Troubleshooting

- **`Can't reach database server …:6543` during `next build`** — a page is being prerendered at build time and hitting the DB. Add `export const dynamic = "force-dynamic"` so it renders per request instead.
- **Enrichment never fires** — `ENRICHMENT_WEBHOOK_URL` must be present in the *running* deployment (Vercel env changes need a redeploy), and `ENRICHMENT_WEBHOOK_SECRET` must be identical on both sides.
- **`pg_dump: server version mismatch`** — install a `pg_dump` ≥ the server version (PG 17) and make sure it's first on `PATH`.
- **`fatal: Unable to create '…/.git/index.lock'`** — a stale lock from a crashed or background git process (e.g. an editor's Git panel). Clear it with `rm -f .git/index.lock` when no real git command is running.
- **Prisma wants to drop `vector` / `tsvector` columns or their indexes** — that's its drift detector misreading hand-authored SQL. Never accept the drop; use `migrate deploy`.
- **A native dependency's build step was skipped** — add it to `allowBuilds` in `pnpm-workspace.yaml` (a recurring pnpm gotcha).
