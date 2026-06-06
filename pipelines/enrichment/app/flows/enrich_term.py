import asyncio
import json
import logging
import time
from collections.abc import Iterator
from contextlib import contextmanager
from uuid import uuid4

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


@contextmanager
def _log_step(step: str, *, request_id: str, term_id: str) -> Iterator[None]:
    """Time one pipeline step and emit a structured JSON log line for it.

    Sync context manager wrapping `await`s is fine: __enter__/__exit__ just
    bracket the timing, and the awaited work runs inside the `with` body.
    """
    start = time.monotonic()
    try:
        yield
    finally:
        logger.info(
            "step complete",
            extra={
                "request_id": request_id,
                "term_id": term_id,
                "step": step,
                "latency_ms": round((time.monotonic() - start) * 1000),
            },
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
    request_id = str(uuid4())
    started = time.monotonic()

    async with db.connect() as conn:
        term = await db.fetch_term(conn, term_id)
        if term is None:
            logger.warning(
                "term not found",
                extra={"request_id": request_id, "term_id": term_id, "step": "fetch"},
            )
            return

        with _log_step("generate", request_id=request_id, term_id=term_id):
            generated = await asyncio.to_thread(_generate, term)
        with _log_step("wikipedia", request_id=request_id, term_id=term_id):
            summary = await _wikipedia(term.name)
        with _log_step("embed", request_id=request_id, term_id=term_id):
            embedding = await asyncio.to_thread(_embed, _embedding_text(term))

        with _log_step("persist", request_id=request_id, term_id=term_id):
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

        logger.info(
            "enrichment complete",
            extra={
                "request_id": request_id,
                "term_id": term_id,
                "step": "done",
                "latency_ms": round((time.monotonic() - started) * 1000),
            },
        )
