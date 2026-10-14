import traceback

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.logger_config import get_logger
from app.utils.request_context import request_id_var

logger = get_logger(__name__)

_DEFAULT_CODES = {401: "UNAUTHENTICATED", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED", 422: "VALIDATION_ERROR", 429: "RATE_LIMITED"}


def _envelope(status_code: int, message: str, data: dict) -> JSONResponse:
    resp = JSONResponse(status_code=status_code, content={"status_code": status_code, "status_message": message, "data": data})
    resp.headers["X-Request-ID"] = request_id_var.get()
    return resp


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        data = {k: v for k, v in detail.items() if k != "message"}
        return _envelope(exc.status_code, detail.get("message", ""), data)
    code = _DEFAULT_CODES.get(exc.status_code, "ERROR")
    return _envelope(exc.status_code, str(detail), {"code": code})


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [
        {"field": ".".join(str(p) for p in e.get("loc", []) if p not in ("body", "query", "path")), "message": e.get("msg", "")}
        for e in exc.errors()
    ]
    return _envelope(422, "Check the highlighted fields.", {"code": "VALIDATION_ERROR", "errors": errors})


async def general_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error: %s", "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)))
    return _envelope(status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal Server Error", {"code": "INTERNAL_ERROR"})
