from fastapi import BackgroundTasks, FastAPI, Header, HTTPException

from app.clients import db
from app.config import get_settings
from app.flows.enrich_term import enrich_term
from app.logging_config import setup_logging
from app.models.schemas import EnrichRequest

setup_logging()

app = FastAPI()


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "build_sha": get_settings().build_sha,
        "db_reachable": await db.ping(),
    }


@app.post("/enrich", status_code=202)
async def enrich(
    payload: EnrichRequest,
    background_tasks: BackgroundTasks,
    x_webhook_secret: str = Header(default=""),
) -> dict[str, str]:
    if x_webhook_secret != get_settings().enrichment_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
    background_tasks.add_task(enrich_term, payload.term_id)
    return {"status": "accepted", "term_id": payload.term_id}
