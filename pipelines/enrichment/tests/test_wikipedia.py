import httpx
import respx

from app.clients.wikipedia import fetch_summary

SUMMARY_RE = r"rest_v1/page/summary/"


@respx.mock
async def test_fetch_summary_found() -> None:
    respx.get(url__regex=SUMMARY_RE).mock(
        return_value=httpx.Response(
            200,
            json={
                "extract": "A streaming platform.",
                "content_urls": {
                    "desktop": {"page": "https://en.wikipedia.org/wiki/Apache_Kafka"}
                },
            },
        )
    )
    result = await fetch_summary("Apache Kafka")
    assert result is not None
    assert result.summary == "A streaming platform."
    assert "Apache_Kafka" in result.url


@respx.mock
async def test_fetch_summary_404() -> None:
    respx.get(url__regex=SUMMARY_RE).mock(return_value=httpx.Response(404))
    assert await fetch_summary("Nonexistent Term") is None