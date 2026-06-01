import math
from functools import lru_cache

from google import genai
from google.genai import types

from app.config import get_settings
from app.models.schemas import GeneratedContent, Term

GENERATION_MODEL = "gemini-2.5-flash"
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 768


@lru_cache
def _client() -> genai.Client:
    return genai.Client(api_key=get_settings().gemini_api_key)


def build_prompt(term: Term) -> str:
    return (
        "You are writing for a data engineering glossary.\n"
        f"Term: {term.name}\n"
        f"Short definition: {term.short_definition}\n\n"
        "Produce:\n"
        "1. 'examples': 2-3 short, idiomatic code snippets illustrating the term — "
        "each with a 'language', the 'code', and a one-line 'explanation'.\n"
        "2. 'clarification': a 2-3 sentence plain-English explanation for a newcomer."
    )


def generate(term: Term) -> GeneratedContent:
    response = _client().models.generate_content(
        model=GENERATION_MODEL,
        contents=build_prompt(term),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeneratedContent,
        ),
    )
    if response.text is None:
        raise ValueError("Gemini returned no text")
    return GeneratedContent.model_validate_json(response.text)


def embed(text: str) -> list[float]:
    response = _client().models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
    )
    if not response.embeddings or response.embeddings[0].values is None:
        raise ValueError("Gemini returned no embedding")
    values = response.embeddings[0].values
    norm = math.sqrt(sum(v * v for v in values))
    return [v / norm for v in values] if norm else list(values)
