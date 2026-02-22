import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from src.observability.logger import get_logger

log = get_logger(__name__)


class TracingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", uuid.uuid4().hex[:16])
        start = time.perf_counter()

        request.state.request_id = request_id
        request.state.start_time = start

        response: Response = await call_next(request)

        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Latency-Ms"] = str(latency_ms)

        log.info(
            "%s %s %s %.1fms",
            request.method,
            request.url.path,
            response.status_code,
            latency_ms,
        )
        return response
