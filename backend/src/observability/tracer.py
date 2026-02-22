import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from src.observability.logger import get_logger
from src.observability.metrics import HTTP_REQUESTS, HTTP_LATENCY

log = get_logger(__name__)


def _normalize_path(path: str) -> str:
    """Collapse path params to reduce cardinality (e.g. /chat/history/abc -> /chat/history/:id)."""
    parts = path.strip("/").split("/")
    normalized = []
    for i, part in enumerate(parts):
        if len(part) > 8 and part.isalnum():
            normalized.append(":id")
        else:
            normalized.append(part)
    return "/" + "/".join(normalized)


class TracingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", uuid.uuid4().hex[:16])
        start = time.perf_counter()

        request.state.request_id = request_id
        request.state.start_time = start

        response: Response = await call_next(request)

        elapsed = time.perf_counter() - start
        latency_ms = round(elapsed * 1000, 2)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Latency-Ms"] = str(latency_ms)

        endpoint = _normalize_path(request.url.path)
        HTTP_REQUESTS.labels(
            method=request.method,
            endpoint=endpoint,
            status=response.status_code,
        ).inc()
        HTTP_LATENCY.labels(
            method=request.method,
            endpoint=endpoint,
        ).observe(elapsed)

        log.info(
            "%s %s %s %.1fms req=%s",
            request.method,
            request.url.path,
            response.status_code,
            latency_ms,
            request_id,
        )
        return response
