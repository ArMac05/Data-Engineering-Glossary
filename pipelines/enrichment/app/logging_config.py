import json
import logging

# The attributes the stdlib puts on every LogRecord. Anything NOT in this set
# was passed by us via `logger.info(..., extra={...})` — those are the
# structured fields we want to surface (term_id, request_id, step, latency_ms).
_STANDARD_ATTRS = {
    "name",
    "msg",
    "args",
    "levelname",
    "levelno",
    "pathname",
    "filename",
    "module",
    "exc_info",
    "exc_text",
    "stack_info",
    "lineno",
    "funcName",
    "created",
    "msecs",
    "relativeCreated",
    "thread",
    "threadName",
    "processName",
    "process",
    "taskName",
    "message",
    "asctime",
}


class JsonFormatter(logging.Formatter):
    """Renders each log record as a single-line JSON object."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # Merge in any structured fields we attached via `extra=`.
        for key, value in record.__dict__.items():
            if key not in _STANDARD_ATTRS:
                payload[key] = value
        return json.dumps(payload)


def setup_logging() -> None:
    """Make the 'enrichment' logger emit JSON. Scoped to our logger (and
    propagate=False) so we don't fight with uvicorn's own access logs."""
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    logger = logging.getLogger("enrichment")
    logger.handlers = [handler]
    logger.setLevel(logging.INFO)
    logger.propagate = False
