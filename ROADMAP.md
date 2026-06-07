# Data Engineering Glossary — Project Roadmap

A personal glossary of data engineering terms, built daily-driver-quality, as a portfolio piece, and as a learning project for modern tooling. Terms are created and edited through an admin UI inside the app. After a term is saved, a background enrichment pipeline adds code examples, a Wikipedia summary, and an embedding for semantic search. Quiz/spaced-repetition and analytics features will be added in a later release — they are explicitly out of scope for the build phases below, but the schema is designed so they can be added without rework.

This document is the source of truth for what we're building, in what order, and why. Phases are completed strictly in sequence; each phase has a Definition of Done that must be verified before the next phase begins.

---

## Tech Stack (Final)

### Frontend & app server

- **Next.js 16 (App Router) + TypeScript** (originally specced as 15 — see Decision Log) — Server Components for public pages (cheap, SEO-friendly, no client-side fetch waterfall), Route Handlers for the admin API (server-only mutations).
- **Tailwind CSS + shadcn/ui** — Tailwind for styling primitives; shadcn/ui for accessible, copy-paste components (button, dialog, form, table) so the admin panel doesn't eat a week of frontend work.

### Database

- **PostgreSQL via Supabase** (free tier) — Managed Postgres with auth, storage, and a generous free tier. Single source of truth.
- **Prisma ORM** — Schema-as-code, type-safe queries, smooth migrations. pgvector columns are typed as `Unsupported("vector")` and queried via raw SQL where needed.
- **pgvector extension** — Stores embeddings as `vector(768)` (Gemini `text-embedding-004` output dimension). HNSW index for fast cosine-similarity search.
- **Postgres native full-text search** — `tsvector` column + GIN index. No Elasticsearch, no Algolia — the corpus is small enough that Postgres FTS is more than enough.

### Auth

- **Supabase Auth** with a single-admin email allowlist. Public routes are unauthenticated. Admin routes require a logged-in session whose email matches `ADMIN_EMAILS`. Row Level Security on the database enforces the same boundary defensively.

### Enrichment pipeline

- **Python 3.12** managed with **uv** — uv is the fast, modern Python toolchain; pinned interpreter and lockfile out of the box.
- **FastAPI** — Lightweight HTTP service exposing `POST /enrich`. Next.js fires a webhook to this endpoint when a term is created or updated.
- **Pydantic** — Schema validation for every external API response (Gemini, Wikipedia) and every inbound webhook payload.
- **Google Gemini API** (free tier) — `gemini-2.0-flash` (or current free-tier flagship) for example generation; `text-embedding-004` for embeddings. One API key, free for this project's volume.
- **Idempotency** — Every write is an upsert keyed by `term_id`. Re-running enrichment for the same term produces the same final state, never duplicate rows.
- **Manual retry** — Exponential backoff (~10 lines) around each external call. No orchestrator — chose FastAPI over Prefect to keep the surface area small.

### Deployment

- **Vercel** for the Next.js app — Free hobby tier, preview deployments per PR.
- **Supabase Cloud** for Postgres + Auth.
- **Fly.io or Render** for the FastAPI service — Decision deferred to Phase 6; both have a free tier sufficient for this workload.
- **GitHub Actions** for CI — lint + typecheck + tests on every push, preview deploy on every PR.

### Testing & CI/CD

- **Vitest** — Unit tests for the Next.js app.
- **Playwright** — End-to-end tests, one happy-path flow per phase.
- **pytest** — Unit tests for the FastAPI pipeline.
- **Ruff + mypy** — Lint + typecheck the Python side.
- **ESLint + Prettier + `tsc --noEmit`** — Lint + format + typecheck the TypeScript side.
- **`prisma format` + `prisma validate`** — Catch schema drift in CI before it hits the DB.

---

## Repository Layout

```
Data-Engineering-Glossary/
├── apps/
│   └── web/                          # Next.js 15 app (App Router)
│       ├── app/
│       │   ├── (public)/             # Public pages (Server Components)
│       │   ├── admin/                # Admin pages (auth-gated)
│       │   └── api/                  # Route Handlers
│       ├── components/               # shadcn/ui + custom components
│       ├── lib/                      # Prisma client, auth helpers, utils
│       └── prisma/
│           ├── schema.prisma
│           ├── migrations/
│           └── seed.ts
├── pipelines/
│   └── enrichment/                   # FastAPI service
│       ├── app/
│       │   ├── main.py               # FastAPI entry
│       │   ├── flows/                # enrich_term, helpers
│       │   ├── clients/              # gemini.py, wikipedia.py, db.py
│       │   └── models/               # Pydantic schemas
│       ├── tests/
│       └── pyproject.toml
├── .github/
│   └── workflows/
│       └── ci.yml                    # lint + typecheck + tests
├── .env.example
├── README.md
└── ROADMAP.md                        # This file
```

---

## Workflow Rules

1. **Plan before coding.** Each phase starts with a 5–10 bullet plan posted in the chat for approval before any code is written.
2. **One concern per PR-sized chunk.** Schema changes, UI work, and pipeline work do not mix in a single PR.
3. **Confirm destructive commands.** Migrations, deletions, and deploys are shown for approval before running.
4. **Verify the DoD.** Every phase ends with the Definition of Done checks run live; the output is pasted into the phase report.
5. **Flag trade-offs.** Any library or pattern chosen outside this document is justified in one or two sentences.
6. **No mock data when real data works.** The seed script is the development dataset.
7. **Ask, don't guess.** Architectural decisions surface as questions, not assumptions.

---

# Phases

## Phase 0 — Repo & tooling baseline

**Goal:** Stand up the monorepo so the first real PR is about features, not setup. Everything that follows depends on this being boring and correct.

**What we build**

- Initialize the monorepo at the repo root with two top-level packages: `apps/web/` (Next.js) and `pipelines/enrichment/` (FastAPI).
- Set up **pnpm** as the Node package manager (workspaces config at the root) and **uv** as the Python toolchain (per-package `pyproject.toml`).
- Scaffold Next.js 15 with the App Router, TypeScript strict mode, Tailwind v4, and shadcn/ui initialized.
- Scaffold the FastAPI app with a `/health` endpoint that returns `{"status": "ok"}` — just enough to prove the service runs.
- Configure linters and formatters: **ESLint + Prettier + `tsc --noEmit`** for TS; **Ruff + mypy** for Python.
- Write a `.env.example` covering every variable the project will eventually need: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `GEMINI_API_KEY`, `ENRICHMENT_WEBHOOK_URL`, `ENRICHMENT_WEBHOOK_SECRET`. Most are stubs at this phase but documenting them now prevents drift.
- Write a `README.md` skeleton with sections for Setup, Running locally, Running tests, and Architecture (filled in over later phases).
- Wire up **GitHub Actions** with a single `ci.yml` workflow that runs on every push: lint + typecheck for both packages, with caching for pnpm and uv to keep runs fast.

**Definition of Done**

- `pnpm install && pnpm lint && pnpm typecheck` exits 0.
- `uv sync && uv run ruff check && uv run mypy .` exits 0 inside `pipelines/enrichment/`.
- A trivial PR (e.g., adding a line to the README) triggers CI and lands green.
- The `/health` endpoint returns 200 when FastAPI is run locally.

**Notes & risks**

- This phase is intentionally unsexy. Resist the urge to start on schema work before CI is green — every bug from now on is easier to catch with the safety net in place.

---

## Phase 1 — Database schema & migrations

**Goal:** Lock the data model. Get every table, column, and index right now so later phases never have to touch the schema except to add to it.

**What we build**

- Enable the `vector` extension on Supabase (`CREATE EXTENSION IF NOT EXISTS vector`).
- Author the Prisma schema with these tables:
  - **`terms`** — `id`, `slug` (unique), `name`, `short_definition`, `long_explanation` (markdown), `created_at`, `updated_at`, `published_at` (nullable, for draft state), and a generated `search_vector` column for FTS.
  - **`categories`** — `id`, `slug`, `name`, `description`.
  - **`term_categories`** — many-to-many join table (`term_id`, `category_id`).
  - **`related_terms`** — self-join table for manually curated relationships (`term_id`, `related_term_id`, `relation_type`).
  - **`term_enrichments`** — one-to-one with `terms`. Holds Gemini-generated `examples` (JSONB array of code snippets), `clarification` (plain-English rewrite), `wikipedia_summary` (nullable), `wikipedia_url` (nullable), `model_version`, `enriched_at`.
  - **`term_embeddings`** — one-to-one with `terms`. Holds `embedding` as `vector(768)`, `embedded_at`, `model_version`.
  - **`quiz_attempts`** — placeholder for a future spaced-repetition feature. Columns: `id`, `term_id`, `user_id` (nullable for now), `result`, `attempted_at`. Lives here so Phase 8+ doesn't require core-table migrations.
- Add indexes:
  - **GIN index** on `terms.search_vector` for FTS.
  - **HNSW index** on `term_embeddings.embedding` using `vector_cosine_ops` for similarity search.
  - B-tree indexes on every foreign key.
- Write a seed script that inserts 5 hand-picked terms (e.g., Kafka, dbt, Snowflake, ETL, Data Lake) so every later phase has real-looking data to work against.
- Run the initial migration with `prisma migrate dev --name init` and verify against a fresh Supabase DB.

**Definition of Done**

- `prisma migrate dev` runs clean against a fresh Supabase project.
- The seed script inserts 5 terms without errors.
- `psql` queries return the seeded data; `\di` shows the expected GIN and HNSW indexes.
- `prisma validate` passes in CI.

**Notes & risks**

- pgvector requires the extension to be installed _before_ the first migration that references `vector(...)`. Handle this with a migration that runs `CREATE EXTENSION` as its first statement.
- The `search_vector` column is a generated column (`tsvector GENERATED ALWAYS AS (...) STORED`) computed from `name`, `short_definition`, and `long_explanation` weighted A/B/C respectively. This means Postgres maintains it automatically — no triggers, no app-level sync.
- We're sizing embeddings as `vector(768)` to match Gemini `text-embedding-004`. If we ever swap to OpenAI `text-embedding-3-small` (1536-dim) we'll need a new column and re-embedding — flagged so future-us doesn't get surprised.

---

## Phase 2 — Public read-only app

**Goal:** Ship a working, indexable, fast public site that reads from Postgres. No auth, no writes, no JavaScript-heavy interactivity — just clean Server Components rendering real data.

**What we build**

- **Home page (`/`)** — Lists recent terms grouped by category, with a search bar at the top. Server Component reading directly from Prisma.
- **Term detail page (`/terms/[slug]`)** — Renders `name`, `short_definition`, `long_explanation` (markdown), and the categories the term belongs to. Generates SEO metadata (`<title>`, `<meta description>`, OpenGraph tags) per term.
- **Category listing (`/categories/[slug]`)** — Lists all terms in a category, alphabetical.
- **Search results (`/search?q=...`)** — Runs a `to_tsquery` query against the `search_vector` GIN index, ranks results with `ts_rank_cd`, returns the top 20. The search bar on every page POSTs (or `<Link>`s) here.
- **Layout & navigation** — Header with logo + search, footer with a link back to the GitHub repo. Tailwind for everything; shadcn primitives for the input and button.

**Definition of Done**

- `pnpm dev` shows all 5 seeded terms on the home page.
- Searching "kafka" returns Kafka as the top result.
- Clicking through to `/terms/kafka` renders the page server-side with no client fetch needed.
- Lighthouse score >90 on the home page (Performance, Accessibility, Best Practices, SEO).
- No `"use client"` directives in this phase — everything is server-rendered.

**Notes & risks**

- Resist adding a client-side search-as-you-type input here. The URL-driven `/search?q=...` flow is simpler, indexable by search engines, and works without JS. We can layer instant-search on later if it's worth it.
- Use `next/font` for typography to avoid layout shift; pick one variable font (e.g., Inter) and move on.

---

## Phase 3 — Auth & admin panel

**Goal:** Make the site editable by exactly one person — me. Public read stays unauthenticated; every write goes through a Supabase session whose email is on the allowlist.

**What we build**

- **Supabase Auth wired into Next.js** using `@supabase/ssr` — middleware refreshes the session cookie on every request, server helpers read it in Server Components and Route Handlers.
- **Admin email allowlist** — `ADMIN_EMAILS` env var, comma-separated. A server-side `requireAdmin()` helper throws/redirects if the current session's email isn't on the list.
- **`/admin/login`** — Sign-in page (magic link or password — magic link is simpler).
- **`/admin`** — Dashboard listing all terms with edit/delete actions.
- **`/admin/terms/new`** and **`/admin/terms/[id]/edit`** — Form with Zod validation, optimistic UI, and a markdown editor (`@uiw/react-md-editor` or similar) for `long_explanation`.
- **`/admin/categories/`** — Equivalent CRUD for categories.
- **Route Handlers under `/api/admin/*`** — All mutations go through these. Each handler calls `requireAdmin()` as its first line.
- **Playwright test** — One happy-path: sign in → create term → see it on public site → edit → delete.

**Definition of Done**

- Signing in with an allowlisted email works; signing in with any other email is rejected.
- Creating a term in the UI makes it appear on the public site within one page reload.
- Edit and delete flows work end-to-end.
- Playwright test covers create → edit → delete and passes in CI.
- Non-admin users hitting `/admin` are redirected to `/admin/login`.

**Notes & risks**

- This is the first phase where we have _both_ a client-side form and server-side data, so it's the first phase where Server Actions vs Route Handlers becomes a real choice. We default to Route Handlers for mutations because they're more familiar territory, but Server Actions are a fine alternative if the form ergonomics feel right.
- The `requireAdmin()` helper is a single chokepoint — if it ever returns the wrong thing, the entire admin panel is compromised. Treat it like a security boundary: small, unit-tested, no clever logic.

---

## Phase 4 — Enrichment pipeline (FastAPI + Gemini)

**Goal:** Every term gets a generated set of code examples, a plain-English clarification, a Wikipedia summary (when available), and an embedding — all written back to Postgres idempotently. Triggered automatically when a term is created or updated, and the term still saves even if the pipeline fails.

**What we build**

- **FastAPI service in `pipelines/enrichment/`** — `POST /enrich` accepts `{"term_id": "..."}` plus a shared-secret header for auth. Returns 202 immediately and runs the actual work in a background task.
- **Pydantic models** for: inbound webhook payload, Gemini generation response, Gemini embedding response, Wikipedia summary response, and the final upsert payload. Every external API response is validated before it touches the DB.
- **`enrich_term(term_id)` function** — Orchestrates the work:
  1. Fetch the term from Postgres (asyncpg or psycopg).
  2. Call Gemini to generate 2–3 example code snippets and a plain-English clarification. Prompt is checked into the repo.
  3. Call Wikipedia's REST API for a summary. Handle the "no article found" case gracefully — `wikipedia_summary` and `wikipedia_url` stay NULL.
  4. Call Gemini `text-embedding-004` to embed `name + short_definition + long_explanation`.
  5. Upsert all results into `term_enrichments` and `term_embeddings` keyed by `term_id`.
- **Retry logic** — Exponential backoff with jitter, max 3 attempts, for each external call. Logged with structured fields (`term_id`, `step`, `attempt`).
- **Webhook from Next.js** — When a term is created or updated via the admin API, fire-and-forget POST to the FastAPI service. The Next.js mutation succeeds regardless of pipeline outcome; the user sees the term immediately, and enrichment fields fill in over the next ~30 seconds.
- **pytest suite** — Mocks Gemini and Wikipedia. Covers happy path, Gemini failure, Wikipedia 404, idempotency (running enrich twice produces the same final state).

**Definition of Done**

- Creating a term in the admin UI causes the FastAPI service to receive a webhook within a second.
- Within ~30 seconds, the enriched fields (`examples`, `clarification`, `wikipedia_summary`, embedding) appear on the public page.
- Re-running enrichment for the same term does not create duplicate rows in `term_enrichments` or `term_embeddings`.
- `pytest` passes locally and in CI.
- A term whose enrichment fails still appears on the public site; the failure is logged but doesn't surface to the user.

**Notes & risks**

- Gemini's free tier has rate limits (15 RPM, 1M tokens/day at the time of writing). Adequate for a personal glossary but worth logging usage so we notice if we ever brush against them.
- The shared secret protecting `/enrich` is the _only_ thing standing between the internet and our Gemini quota. Don't lose it.
- Idempotency is enforced by upserting on `term_id`. Don't ever insert without `ON CONFLICT DO UPDATE`.

---

## Phase 5 — Semantic search & related terms

**Goal:** Use the embeddings produced in Phase 4 to power "related terms" widgets on every page and an optional semantic-search mode on `/search`. No new pipeline work — purely a read-side feature.

**What we build**

- **"Related terms" section** on every `/terms/[slug]` page. A Server Component runs a Prisma raw query that selects the 5 nearest neighbors by cosine distance, excluding the term itself.
- **`/search` semantic toggle** — A query parameter (`?q=...&mode=semantic`) switches the search query from `tsvector` to an embedding-based nearest-neighbor lookup. Embed the user's query at request time (cheap), then run a HNSW-backed similarity query.
- **Performance check** — Verify that with the HNSW index, both queries return under 50ms p95 on the seeded dataset.
- **Vitest tests** for the similarity query helper (mocking the embedding call, asserting the SQL is shaped right).

**Definition of Done**

- Every term page shows 5 contextually related terms.
- Toggling semantic search for "streaming data processing" returns Kafka, Flink, etc. — even if those exact words aren't in my query.
- Tests cover the similarity query.

**Notes & risks**

- Embedding the query at request time means each semantic search costs one Gemini call. Cache the embedding for common queries if usage grows; for now, the free tier eats it.
- The HNSW index trades a small bit of recall for huge speed. For 200 terms this is irrelevant; for 20,000 it'd still be fine. Worth knowing.

---

## Phase 6 — Deployment

**Goal:** Real public URL, real production data, real CI/CD. From now on the development loop includes preview deployments and a real-world environment.

**What we build**

- **Vercel** — Deploy the Next.js app. Hobby plan is free and sufficient. Environment variables wired from a `.env.production` template. Preview deployments enabled per PR.
- **Supabase Cloud** — Production project distinct from local dev. Run migrations against it. Configure connection pooling (the `DIRECT_URL` / `DATABASE_URL` split that Prisma + Supabase needs).
- **FastAPI deployed to Fly.io or Render** — Decide at the start of this phase. Fly.io is the better portfolio answer (Dockerfile, regional config, real infra-as-code); Render is the faster ship. Either way, expose only the `/enrich` endpoint behind the shared-secret header.
- **Supabase RLS policies** — `terms`, `categories`, `term_categories`, `related_terms`, `term_enrichments`, `term_embeddings` all readable by `anon`; no `anon` writes anywhere. The service role key (used by Next.js Route Handlers and the FastAPI service) bypasses RLS.
- **GitHub Actions secrets** — `VERCEL_TOKEN`, `SUPABASE_*`, `GEMINI_API_KEY`, `ENRICHMENT_WEBHOOK_SECRET`, deploy targets.
- **End-to-end verification** — From production: sign in, create a term, watch enrichment fire, see the term enriched on the live site.

**Definition of Done**

- App is live at a public URL.
- CI deploys preview environments per PR.
- A curl against the public Supabase URL with the anon key trying to write returns 401/403 — pasted into the phase report as proof.
- The full create-term → enrichment-runs → enriched-on-public-site flow works in production.

**Notes & risks**

- Connection pooling matters. Prisma in serverless functions wants the pooled connection string for queries (`DATABASE_URL`) but the direct connection string for migrations (`DIRECT_URL`). Document this in the README — it's the #1 thing that bites people.
- Don't commit the production `.env`. Use GitHub Actions secrets and Vercel's env UI; rely on `.env.example` as the documentation.

---

## Phase 7 — Hardening

**Goal:** Make the project look and behave like something I'd hand to a coworker. Observability, backups, rate limits, fresh-clone reproducibility.

**What we build**

- **Sentry** (free tier) on both Next.js and FastAPI. Wire up a `/api/_test/throw` route that deliberately throws so we can confirm Sentry caught it. Same in FastAPI.
- **Structured logging** in the FastAPI pipeline — JSON logs with `term_id`, `request_id`, `step`, `latency_ms`. Easy to grep, easy to ship to a log aggregator later.
- **Rate limits** on the admin API — Token bucket per IP using Upstash Redis (free tier) or a simple in-memory limiter. The admin API isn't public, but the login route is, and we don't want it brute-forced.
- **Backup strategy** — Supabase Pro has PITR built in, but on the free tier we run a scheduled `pg_dump` via GitHub Actions to a private bucket (Supabase Storage works). Document a tested restore procedure.
- **`/health` endpoints** on both services, returning `{status, build_sha, db_reachable}`.
- **README finalization** — Setup, run-local, run-tests, deploy, troubleshoot. A fresh clone on a clean machine should reach "running locally" in under 10 minutes.

**Definition of Done**

- README walkthrough tested on a fresh clone — actual elapsed time pasted into the phase report.
- A deliberate exception in each service shows up in Sentry within a minute.
- Backup script produces a dump that successfully restores to a scratch DB.
- `/health` endpoints return 200 with the expected payload shape.

**Notes & risks**

- This phase is the easiest to skip and the most embarrassing to skip. A working app with no observability is a working app for exactly as long as nothing breaks.

---

## Out of Scope (For Now)

Documented here so we don't accidentally drift into them:

- **Quiz / spaced-repetition feature.** The `quiz_attempts` table exists; the UI does not. Future release.
- **Multi-user auth.** Single admin only. No sign-ups, no public accounts.
- **Comments or community contributions.** Read-only public site.
- **Analytics dashboards.** No PostHog, no GA wiring beyond what Vercel gives for free.
- **i18n.** English only.
- **Mobile app.** Web only.

Each of these can be added on top of the schema and architecture we're building — that's the point of designing it this way — but none of them are part of the build path.

---

## Decision Log

A running list of choices made during planning, in case future-me wonders why:

| Choice           | Alternative                      | Why                                                                                                                                                                                                                                    |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma           | Drizzle                          | Smoother migrations and tooling for a solo project. Drizzle has nicer pgvector ergonomics but a rougher migration story.                                                                                                               |
| FastAPI          | Prefect, Supabase Edge Functions | One linear flow doesn't need an orchestrator. Edge Functions would have removed Python entirely, weakening the data-engineering portfolio signal. FastAPI keeps Python + Pydantic + pytest in the stack without orchestrator overhead. |
| Gemini free tier | OpenAI, Anthropic                | Genuinely free at this volume. Both generation and embeddings from one provider. Data-on-free-tier privacy concern is irrelevant for a public glossary.                                                                                |
| Postgres FTS     | Elasticsearch, Algolia           | Corpus is tiny. FTS is a single index away. Operational simplicity wins.                                                                                                                                                               |
| Supabase         | Neon, Railway Postgres           | Free tier includes Auth + Storage + Postgres in one place.                                                                                                                                                                             |
| pnpm             | npm, yarn                        | Faster, disk-efficient, first-class monorepo support.                                                                                                                                                                                  |
| uv               | pip, poetry                      | Modern, fast, single tool for env + lockfile + interpreter.                                                                                                                                                                            |
| Next.js 16       | Next.js 15 (original spec)       | `create-next-app@latest` shipped Next 16 at scaffold time (2026-05-28). App Router, Server Components, and Route Handlers are unchanged from 15, so we took the current major rather than pinning back. Tailwind v4 landed as planned. |
| Prisma 6 | Prisma 7 (latest) | v7 needs a `prisma.config.ts`, a driver adapter, and a generated-client output dir. Pinned to v6 for a simpler model and far more learning resources. |
| Fly.io for FastAPI | Render | Dockerfile + `fly.toml` (infra-as-code) is the stronger portfolio signal and teaches containers/IaC, vs Render's faster dashboard-only deploy. |
| Reuse one Supabase project (dev + prod) | Separate prod project | Solo project; the existing project already holds schema, seed, and enrichments. Deviates from the ROADMAP's distinct dev/prod guidance — no isolation, so destructive local commands hit live data. |
| Supabase Postgres rate limiter | Upstash Redis (ROADMAP spec) | Avoid another free account; reuse the shared DB we already have. Unlike an in-memory limiter, a DB-backed counter works across serverless instances. Login itself is already rate-limited by Supabase Auth, so this targets our own admin write routes as defense-in-depth. |
| Skipped Sentry (PR3) | Sentry on both services (ROADMAP spec) | Deferred to keep scope down; structured logs (PR2) + platform logs cover the "what happened" case without another account. Can revisit. |

---

_Last updated: Phase planning complete. Phase 0 unblocked and ready to start._
