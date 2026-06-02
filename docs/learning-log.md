# Learning Log

A running record of comprehension checkpoints — the question, my answer, and the corrected answer. Kept short on purpose.

## Phase 0 — Repo & tooling baseline

### Q1. Why does the repo need exactly one `pnpm-lock.yaml` at the root, and what was actually going wrong when `apps/web` had its own lockfile and `node_modules`?

**My answer (summary):** One lockfile at the root because it's a monorepo — there's "one build" and everything belongs to the root lockfile. The `apps/web` problem was my user error: pnpm couldn't find/link the folder, which created a separate build inside it.

**Correct answer (summary):**

- The lockfile is about **dependency resolution, not builds.** A monorepo can have many builds. The single root `pnpm-lock.yaml` is one *resolved dependency graph* — the exact pinned version of every package across all workspaces, resolved together. Benefits: deduplicated/consistent shared versions, and identical installs on every clone.
- There were **two separate problems**, not one:
  1. **Nested island in `apps/web`** (its own lockfile + `node_modules` + `pnpm-workspace.yaml`) — caused by `create-next-app`, which dropped its own `pnpm-workspace.yaml` so pnpm treated `web` as a standalone root. Would have happened regardless of our config.
  2. **Root config typo** (`app/*` instead of `apps/*` in the root `pnpm-workspace.yaml`) — the glob matched nothing, so root installs couldn't see `web` and kept saying "Already up to date." This one was my typo.

**Takeaways:**

- "One lockfile at the root" is correct — just frame it as dependency resolution, not builds.
- A workspace glob that matches nothing **fails silently** (no error, just "Already up to date"). Suspect the globs first when pnpm claims there's nothing to do.
- A passing check (e.g. `format:check`) isn't proof the config works — verify it's doing what you think (the empty `.prettierignore` looked green only because files were already formatted).

### Gotchas from the Phase 0 setup grind

- **pnpm 11 renamed build-script approval.** `onlyBuiltDependencies`/`ignoredBuiltDependencies` were *removed* in pnpm 11; the replacement is an `allowBuilds:` map in `pnpm-workspace.yaml` (e.g. `sharp: true`). create-next-app's `allowBuilds` stub was actually correct — we deleted it as "cruft" and used the removed setting, so builds were silently skipped. Local installs hid it (cached `node_modules` already built); the fresh CI install caught it. Lesson: verify build/install config on a *clean* checkout, not one with warm caches.
- **`git add -A` stages everything.** A stray `# type: ignore` edit to `main.py` rode into a commit because we checked `git status` (which files changed) but not `git diff --staged` (what changed inside them). Review the staged diff before committing.
- **A workspace glob typo fails silently.** `app/*` vs `apps/*` made pnpm see zero packages and report "Already up to date" instead of erroring. Suspect globs when a tool claims there's nothing to do.
- **`.prettierignore` must list Python artifacts too.** Prettier scanned `.venv/` and failed `format:check` once the venv existed. Added `.venv`, `__pycache__`, `.mypy_cache`, `.ruff_cache`, `.pytest_cache`.

## Phase 1 — Database schema & migrations

### Q2. Why is `search_vector` a Postgres `GENERATED` column instead of computed in app code on each write?

**My answer (summary):** Guessed it was for creating unique keys / catching duplicate terms.

**Correct answer (summary):** `search_vector` is the full-text-search `tsvector` — unrelated to keys/uniqueness (those are the `slug @unique` / `@@unique` constraints). `GENERATED ALWAYS AS (...) STORED` means Postgres maintains it automatically on every insert/update from `name`/`short_definition`/`long_explanation`. So every write path — seed, admin UI, pipeline — gets a correct vector for free, no app-side sync, no drift. Computing it in app code would force every write path to remember to recompute it; the day one forgets, search silently goes stale.

### Gotchas from Phase 1

- **pnpm `allowBuilds` is recurring.** Every dependency with a native build step (sharp, unrs-resolver, prisma, @prisma/engines, esbuild) must be added to `allowBuilds` in `pnpm-workspace.yaml`, or its build is silently skipped and only fails on a fresh install (e.g. CI).
- **Prisma 7 vs 6.** Latest pulled Prisma 7 (new `prisma-client` generator, `prisma.config.ts`, driver adapters). Pinned to Prisma 6 for simpler learning + abundant docs; v6 auto-loads `.env` and needs no driver adapter.
- **`schema.prisma` vs `migration.sql`.** Raw SQL (`CREATE EXTENSION`, `GENERATED` columns, GIN/HNSW indexes) goes in the migration `.sql`, never in `schema.prisma` — putting SQL in the schema breaks it (P1012).
- **Prisma can't model some Postgres objects.** Typed `embedding`/`search_vector` as `Unsupported(...)`; the generated expression and the GIN/HNSW indexes live only in hand-edited migration SQL. Prisma's drift detector will always propose dropping them — never accept those drops; inspect with `migrate diff`, and use `migrate deploy` (no diffing) in CI/prod.
- **`prisma generate` before typecheck.** The typed client is generated code; a fresh checkout (CI) must run `prisma generate` (with a dummy `DATABASE_URL`) before `tsc`, or `@prisma/client` imports fail.
- **Supabase pooler connection strings** use `postgres.[project-ref]` as the username (not plain `postgres`), the DB password is shown only once (reset it if lost), and the `DATABASE_URL`/`DIRECT_URL` split is pooled-6543 / direct-5432.

## Phase 2 — Public read-only app

### Q3. Why can the public pages query the database directly with no API endpoint, `useEffect`, or loading spinner — and what would client components need instead?

**My answer (summary):** Guessed it was caching the terms; thought client components would need an API key.

**Correct answer (summary):** It's about *where the code runs*. These are **Server Components** — they execute on the server during the request, where they have direct DB access (Prisma client, `DATABASE_URL`). They `await` the query and render to HTML; the browser receives finished HTML and never touches the DB. (`cache()` only dedupes a repeated query within one request — an optimization, not the reason.) **Client Components** run in the browser, which can't connect to Postgres (no driver, and shipping DB creds to the client is a security hole), so they'd need: (1) a server-side API/Route Handler to query the DB, (2) client-side fetching (`useEffect` + `fetch`/React Query), and (3) loading/error state — which is where the spinner comes from.

### Gotchas from Phase 2

- **JSX structure: attributes go inside the opening tag, text between tags.** A mangled `<a>` (opening tag closed empty, attributes spilled into the body as text) produced confusing errors — first `react/no-unescaped-entities` (ESLint read the attribute quotes as text), then `ts(1382)` (missing `<a` tag-opener). The lint error pointed at the quotes, but the real bug was the broken tag.
- **Lighthouse must run on a production build.** `next dev` is unminified with no caching, so its Performance score reads misleadingly low. Run `next build && next start`, then Lighthouse (got all 100s).
- **shadcn pulls `msw`** (needs adding to `allowBuilds`), and its generated files (`button.tsx`, `input.tsx`, `utils.ts`) arrive in shadcn's style — run `pnpm format` so `format:check` passes.
- **`Unsupported` columns require `$queryRaw`.** FTS on `search_vector` can't use the typed client; raw SQL with a parameterized `${query}` (injection-safe) + `websearch_to_tsquery` (tolerates messy human input).
- **`params` / `searchParams` are Promises** in Next 16 — `await` them.

## Phase 3 — Auth & admin panel

### Q4. Why call `requireAdmin()` at the top of every admin page and Route Handler, instead of trusting the proxy/middleware?

**My answer (summary):** requireAdmin always fires on admin pages; the proxy isn't safe because it doesn't block you.

**Correct answer (summary):** Right instinct, two refinements. (1) Our proxy only *refreshes the session* (`getUser()`) — it does no authorization, so it isn't even a gate. (2) Even if auth lived in the proxy it'd be fragile: it runs only on paths in its `matcher` regex, so a gap/typo silently leaves routes unprotected. `requireAdmin()` sits next to the privileged action (the DB write), co-located with what it guards, so a misrouted proxy can't bypass it. Principle: enforce authorization where the sensitive work happens, not at a network layer.

### Gotchas from Phase 3

- **`NEXT_PUBLIC_*` vars are inlined at *build* time**, not read at runtime. CI's "Supabase URL and Key required" meant the *build* lacked them — build steps need the env, and a missing build-time value bakes `undefined` into the bundle.
- **GitHub secrets take raw values — no quotes.** `.env` uses `KEY="value"` (dotenv strips the quotes); pasting quotes into a secret makes them literal characters. A quoted `ADMIN_EMAILS` broke the allowlist match → `requireAdmin` rejected a valid admin.
- **`.env` vs shell env vs CI secrets.** A test passed locally because `E2E_ADMIN_PASSWORD` was *exported in the shell* (not in `.env`); CI only had the GitHub secret. Put values in `.env` for reproducibility; don't rely on shell exports.
- **Next 16 renamed `middleware.ts` → `proxy.ts`** (function `middleware` → `proxy`); Node runtime now.
- **Vitest's default glob matches `.test.ts` AND `.spec.ts`** — it grabbed the Playwright spec. Scoped Vitest to `**/*.test.ts`; Playwright owns `*.spec.ts`.
- **Playwright + Next:** `next dev` compiles routes on first hit (slow → tight timeouts flake). Run e2e against `next build && next start` in CI; raise the `expect` timeout and add `retries`.
- **`app/api/*` = Route Handlers, `app/admin/*` = pages.** Putting a `page.tsx` under `app/api/` broke its relative imports — UI pages never go under `api/`.

## Phase 4 — Enrichment pipeline (FastAPI + Gemini)

### Q5. Why is enrichment fully decoupled from the term save (fire-and-forget webhook, `/enrich` returns 202, work in a background task)? What breaks if "create term" waited for enrichment?

**My answer (summary):** It would return a 404 error.

**Correct answer (summary):** Not a 404. Two real problems if the save waited: (1) it'd be **slow** — enrichment is a Gemini call + Wikipedia fetch + embedding, ~10–30s, so the admin watches a spinner on every save; (2) it'd be **fragile** — if Gemini is down/rate-limited, the save would fail too, coupling your core admin function to a third party's uptime. Decoupling means the save returns instantly and the term exists regardless; enrichment fills in async, and if it fails the term still shows (sections render conditionally). Principle: don't block a fast, reliable operation on a slow, unreliable one.

### Gotchas from Phase 4

- **`google-genai` is the current SDK** (`google-generativeai` is deprecated). Generation: `gemini-2.5-flash`; embeddings: `gemini-embedding-001` with `output_dimensionality=768` (matches the `vector(768)` schema; normalize the result for non-default dims).
- **A throwaway `genai.Client()` got garbage-collected mid-request** ("Cannot send a request, as the client has been closed" — its `__del__` closed the httpx transport). Fix: cache it as a singleton (`@lru_cache`).
- **asyncpg + Supabase:** connect via the direct 5432 URL with `statement_cache_size=0` (pooler-safe), `register_vector(conn)` to bind the embedding, and `ON CONFLICT (term_id) DO UPDATE` for idempotency.
- **asyncpg and pgvector ship no `py.typed`** → mypy strict needs `ignore_missing_imports` overrides for them.
- **`ruff check` (lint) ≠ `ruff format` (formatter)** — CI runs both; run `ruff format` right after writing Python (the Python analog of `pnpm format`). Lint-clean code is not necessarily formatted.
- **Filename typos break imports while mypy still "passes"** (it globs files by path): `__inti__.py`, `schema.py` vs `schemas.py`. The import error is the real signal, not mypy.
- **Wikipedia's REST API requires a `User-Agent` header** (403 without one).
- **CI green ≠ merged.** Phase 3 vanished for a session because the PR was never actually merged — always confirm the merge commit lands on `main`.

## Phase 5 — Semantic search & related terms

### Q6. Semantic search finds Apache Kafka for "streaming data processing" with no shared words. What's being compared, and how does it differ from keyword/FTS? ✅ (got it)

**My answer (summary):** It's the embedding — it ranks terms by cosine of the embeddings.

**Correct + deepened:** Right. The embedding is a 768-number vector that encodes *meaning* — the model maps similar concepts to nearby points in that space, so "streaming data processing" lands near "Apache Kafka — distributed event streaming" despite zero shared words. `<=>` (cosine distance) measures how close two vectors point → similar meaning. FTS (`tsvector @@ tsquery`) instead compares literal word-stems (lexemes) and only matches on word overlap. **FTS matches words; embeddings match meaning** — complementary, hence two search modes.

### Gotchas from Phase 5

- **Related terms = pure SQL** (reuse the term's *stored* embedding, order by pgvector `<=>`); **semantic search = embed the query at request time** then NN lookup. Only the latter calls Gemini.
- **The query embedding must match the pipeline exactly** — same model (`gemini-embedding-001`), dims (768), and L2 normalization — or the query vector isn't comparable to the stored ones and results are garbage.
- **Querying pgvector from Prisma needs `$queryRaw`** (the embedding column is `Unsupported`); pass the query vector as a `[v1,v2,...]::vector` literal bound as a parameter.
- **FTS matches whole-word lexemes, not prefixes/substrings.** `websearch_to_tsquery` can't do prefix; for "type s → Snowflake" build a `to_tsquery` with `:*` per token (sanitize tokens to stay injection-safe). Semantic mode covers the fuzzy "don't know the word" case.
- **Vitest `@/` alias:** Vite resolves tsconfig paths natively (`resolve: { tsconfigPaths: true }`) — no plugin needed. Use `vi.hoisted()` for mock fns referenced inside `vi.mock()` factories (which are hoisted above imports).
- **`@google/genai` + `protobufjs`** needed `allowBuilds` entries (the recurring pnpm gate).
