# Data Engineering Glossary

A personal, daily-driver-quality glossary of data engineering terms — a portfolio piece and a learning project for the modern web stack. See [ROADMAP.md](./ROADMAP.md) for the full spec, phases, and decision log.

## Setup

_TODO: prerequisites (Node + pnpm, Python 3.12 + uv), clone, install deps, copy `.env.example` → `.env`._

## Running locally

_TODO: start the Next.js app (`pnpm --filter web dev`) and the FastAPI enrichment service (`uv run uvicorn app.main:app --reload`)._

## Running tests

_TODO: TS suite (Vitest, Playwright) and Python suite (pytest)._

## Architecture

_TODO: monorepo layout (`apps/web`, `pipelines/enrichment`), data flow (admin write → webhook → enrichment → Postgres), tech stack. See ROADMAP.md for now._