from contextlib import asynccontextmanager
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.flows import enrich_term as flow
from app.models.schemas import CodeExample, GeneratedContent, Term, WikipediaSummary


@pytest.fixture
def mocks(monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    term = Term(id="t1", name="Kafka", short_definition="streaming", long_explanation=None)

    @asynccontextmanager
    async def fake_connect() -> Any:
        yield object()

    upsert_enrichment = AsyncMock()
    upsert_embedding = AsyncMock()
    monkeypatch.setattr(flow.db, "connect", fake_connect)
    monkeypatch.setattr(flow.db, "fetch_term", AsyncMock(return_value=term))
    monkeypatch.setattr(flow.db, "upsert_enrichment", upsert_enrichment)
    monkeypatch.setattr(flow.db, "upsert_embedding", upsert_embedding)

    monkeypatch.setattr(
        flow,
        "_generate",
        lambda t: GeneratedContent(
            examples=[CodeExample(language="python", code="print('hi')")],
            clarification="A plain-English explanation.",
        ),
    )
    monkeypatch.setattr(flow, "_embed", lambda text: [0.1] * 768)

    async def fake_wiki(title: str) -> WikipediaSummary:
        return WikipediaSummary(summary="From Wikipedia.", url="https://en.wikipedia.org/wiki/Kafka")

    monkeypatch.setattr(flow, "_wikipedia", fake_wiki)

    return SimpleNamespace(upsert_enrichment=upsert_enrichment, upsert_embedding=upsert_embedding)


async def test_happy_path(mocks: SimpleNamespace) -> None:
    await flow.enrich_term("t1")
    mocks.upsert_enrichment.assert_awaited_once()
    mocks.upsert_embedding.assert_awaited_once()
    kwargs = mocks.upsert_enrichment.await_args.kwargs
    assert kwargs["clarification"] == "A plain-English explanation."
    assert kwargs["wikipedia_summary"] == "From Wikipedia."


async def test_gemini_failure_propagates(
    mocks: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    def boom(t: Term) -> GeneratedContent:
        raise RuntimeError("gemini down")

    monkeypatch.setattr(flow, "_generate", boom)
    with pytest.raises(RuntimeError):
        await flow.enrich_term("t1")
    mocks.upsert_enrichment.assert_not_awaited()


async def test_wikipedia_404_is_null(
    mocks: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def no_article(title: str) -> None:
        return None

    monkeypatch.setattr(flow, "_wikipedia", no_article)
    await flow.enrich_term("t1")
    kwargs = mocks.upsert_enrichment.await_args.kwargs
    assert kwargs["wikipedia_summary"] is None
    assert kwargs["wikipedia_url"] is None


async def test_idempotent_double_run(mocks: SimpleNamespace) -> None:
    await flow.enrich_term("t1")
    await flow.enrich_term("t1")
    assert mocks.upsert_enrichment.await_count == 2
    assert mocks.upsert_embedding.await_count == 2