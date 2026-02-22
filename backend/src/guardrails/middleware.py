import re
import json

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from src.config import get_settings
from src.observability.logger import get_logger
from src.observability.metrics import GUARDRAIL_CHECKS, GUARDRAIL_BLOCKS, GUARDRAIL_FLAGS

log = get_logger(__name__)

PII_PATTERNS = {
    "email": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
    "phone": re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"),
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b"),
}

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(a|an)\s+", re.IGNORECASE),
    re.compile(r"system\s*:\s*", re.IGNORECASE),
    re.compile(r"<\s*/?\s*system\s*>", re.IGNORECASE),
    re.compile(r"forget\s+(everything|all|your)", re.IGNORECASE),
    re.compile(r"new\s+instructions?\s*:", re.IGNORECASE),
]

BLOCKED_CONTENT = [
    re.compile(r"\b(hack|exploit|bypass|crack)\s+(the\s+)?(system|security|auth)", re.IGNORECASE),
]


def detect_pii(text: str) -> list[str]:
    found = []
    for name, pattern in PII_PATTERNS.items():
        if pattern.search(text):
            found.append(f"pii_{name}")
    return found


def detect_injection(text: str) -> list[str]:
    found = []
    for pattern in INJECTION_PATTERNS:
        if pattern.search(text):
            found.append("prompt_injection")
            break
    return found


def detect_blocked_content(text: str) -> list[str]:
    found = []
    for pattern in BLOCKED_CONTENT:
        if pattern.search(text):
            found.append("blocked_content")
            break
    return found


class GuardrailsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        settings = get_settings()

        if request.method == "POST" and "/chat" in request.url.path:
            try:
                body = await request.body()
                data = json.loads(body) if body else {}
                message = data.get("message", "")
            except (json.JSONDecodeError, UnicodeDecodeError):
                message = ""

            triggered = []

            if settings.guardrails_pii_enabled:
                GUARDRAIL_CHECKS.labels(type="pii").inc()
                pii_hits = detect_pii(message)
                triggered.extend(pii_hits)
                for hit in pii_hits:
                    GUARDRAIL_FLAGS.labels(type=hit).inc()

            if settings.guardrails_injection_enabled:
                GUARDRAIL_CHECKS.labels(type="injection").inc()
                injection_hits = detect_injection(message)
                triggered.extend(injection_hits)

            if settings.guardrails_content_filter_enabled:
                GUARDRAIL_CHECKS.labels(type="content_filter").inc()
                content_hits = detect_blocked_content(message)
                triggered.extend(content_hits)

            if "prompt_injection" in triggered:
                GUARDRAIL_BLOCKS.labels(type="prompt_injection").inc()
                log.warning("Blocked prompt injection attempt: %s", request.client.host)
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Request blocked by guardrails: potential prompt injection detected."},
                )

            if "blocked_content" in triggered:
                GUARDRAIL_BLOCKS.labels(type="blocked_content").inc()
                log.warning("Blocked harmful content: %s", request.client.host)
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Request blocked by guardrails: inappropriate content detected."},
                )

            request.state.guardrails_triggered = triggered
        else:
            request.state.guardrails_triggered = []

        return await call_next(request)
