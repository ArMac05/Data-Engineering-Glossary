from pydantic import BaseModel


class EnrichRequest(BaseModel):
    """Inbound webhook payload."""

    term_id: str


class Term(BaseModel):
    """A term row fetched from Postgres."""

    id: str
    name: str
    short_definition: str
    long_explanation: str | None = None


class CodeExample(BaseModel):
    language: str
    code: str
    explanation: str | None = None


class GeneratedContent(BaseModel):
    """Parsed + validated Gemini generation output."""

    examples: list[CodeExample]
    clarification: str


class WikipediaSummary(BaseModel):
    summary: str
    url: str


class EnrichmentResult(BaseModel):
    """The fully-assembled payload we upsert into Postgres."""

    term_id: str
    examples: list[CodeExample]
    clarification: str
    wikipedia_summary: str | None = None
    wikipedia_url: str | None = None
    embedding: list[float]
    model_version: str
