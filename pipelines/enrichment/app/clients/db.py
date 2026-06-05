from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg
from pgvector.asyncpg import register_vector

from app.config import get_settings
from app.models.schemas import Term


@asynccontextmanager
async def connect() -> AsyncIterator[asyncpg.Connection]:
    conn = await asyncpg.connect(
        get_settings().database_url,
        statement_cache_size=0,  # safe with Supabase's pooler
    )
    try:
        await register_vector(conn)
        yield conn
    finally:
        await conn.close()


async def ping() -> bool:
    """Cheap reachability check for /health. Never raises — returns False on
    any failure so the health endpoint can report status without crashing."""
    try:
        conn = await asyncpg.connect(
            get_settings().database_url,
            statement_cache_size=0,
            timeout=5,
        )
        try:
            await conn.fetchval("SELECT 1")
            return True
        finally:
            await conn.close()
    except Exception:
        return False


async def fetch_term(conn: asyncpg.Connection, term_id: str) -> Term | None:
    row = await conn.fetchrow(
        "SELECT id, name, short_definition, long_explanation FROM terms WHERE id = $1",
        term_id,
    )
    if row is None:
        return None
    return Term(
        id=row["id"],
        name=row["name"],
        short_definition=row["short_definition"],
        long_explanation=row["long_explanation"],
    )


async def upsert_enrichment(
    conn: asyncpg.Connection,
    *,
    term_id: str,
    examples_json: str,
    clarification: str,
    wikipedia_summary: str | None,
    wikipedia_url: str | None,
    model_version: str,
) -> None:
    await conn.execute(
        """
        INSERT INTO term_enrichments (
            term_id, examples, clarification, wikipedia_summary,
            wikipedia_url, model_version, enriched_at
        )
        VALUES ($1, $2::jsonb, $3, $4, $5, $6, now())
        ON CONFLICT (term_id) DO UPDATE SET
            examples = EXCLUDED.examples,
            clarification = EXCLUDED.clarification,
            wikipedia_summary = EXCLUDED.wikipedia_summary,
            wikipedia_url = EXCLUDED.wikipedia_url,
            model_version = EXCLUDED.model_version,
            enriched_at = now()
        """,
        term_id,
        examples_json,
        clarification,
        wikipedia_summary,
        wikipedia_url,
        model_version,
    )


async def upsert_embedding(
    conn: asyncpg.Connection,
    *,
    term_id: str,
    embedding: list[float],
    model_version: str,
) -> None:
    await conn.execute(
        """
        INSERT INTO term_embeddings (term_id, embedding, model_version, embedded_at)
        VALUES ($1, $2, $3, now())
        ON CONFLICT (term_id) DO UPDATE SET
            embedding = EXCLUDED.embedding,
            model_version = EXCLUDED.model_version,
            embedded_at = now()
        """,
        term_id,
        embedding,
        model_version,
    )
