import json
import logging
import asyncio

from tenacity import (
    before_sleep_log,
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
)

from app.clients import db, gemini, wikipedia
from app.clients.gemini import EMBEDDING_MODEL, GENERATION_MODEL
from app.models.schemas import GeneratedContent, Term, WikipediaSummary

logger = logging.getLogger("enrichment")

_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=1, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)


@_retry
def _generate(term: Term) -> GeneratedContent:
    return gemini.generate(term)


@_retry
def _embed(text: str) -> list[float]:
    return gemini.embed(text)


@_retry
async def _wikipedia(title: str) -> WikipediaSummary | None:
    return await wikipedia.fetch_summary(title)


def _embedding_text(term: Term) -> str:
    parts = [term.name, term.short_definition, term.long_explanation or ""]
    return "\n".join(p for p in parts if p)


async def enrich_term(term_id: str) -> None:
    async with db.connect() as conn:
        term = await db.fetch_term(conn, term_id)
        if term is None:
            logger.warning(json.dumps({"term_id": term_id, "step": "fetch", "status": "not_found"}))
            return

        generated = await asyncio.to_thread(_generate, term)
        summary = await _wikipedia(term.name)
        embedding = await asyncio.to_thread(_embed, _embedding_text(term))

        examples_json = json.dumps([ex.model_dump() for ex in generated.examples])
        await db.upsert_enrichment(
            conn,
            term_id=term.id,
            examples_json=examples_json,
            clarification=generated.clarification,
            wikipedia_summary=summary.summary if summary else None,
            wikipedia_url=summary.url if summary else None,
            model_version=GENERATION_MODEL,
        )
        await db.upsert_embedding(
            conn,
            term_id=term.id,
            embedding=embedding,
            model_version=EMBEDDING_MODEL,
        )
        logger.info(json.dumps({"term_id": term_id, "step": "done", "status": "ok"}))
