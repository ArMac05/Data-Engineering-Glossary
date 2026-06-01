from urllib.parse import quote

import httpx

from app.models.schemas import WikipediaSummary

SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
USER_AGENT = "DataEngineeringGlossary/1.0 (learning project)"


async def fetch_summary(title: str) -> WikipediaSummary | None:
    url = SUMMARY_URL.format(title=quote(title))
    async with httpx.AsyncClient(
        timeout=10.0, headers={"User-Agent": USER_AGENT}
    ) as client:
        response = await client.get(url)

    if response.status_code == 404:
        return None
    response.raise_for_status()

    data = response.json()
    extract = data.get("extract")
    page_url = data.get("content_urls", {}).get("desktop", {}).get("page")
    if not extract or not page_url:
        return None
    return WikipediaSummary(summary=extract, url=page_url)
