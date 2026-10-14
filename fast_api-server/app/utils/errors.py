from fastapi import HTTPException


class ApiError(HTTPException):
    """HTTPException that always carries a stable machine code in detail.code."""

    def __init__(self, status_code: int, code: str, message: str, extra: dict | None = None):
        detail = {"code": code, "message": message}
        if extra:
            detail.update(extra)
        super().__init__(status_code=status_code, detail=detail)


def unauthenticated(message: str = "Sign in again."):
    return ApiError(401, "UNAUTHENTICATED", message)


def not_found(message: str = "Not found."):
    return ApiError(404, "NOT_FOUND", message)


def invalid_state(message: str):
    return ApiError(409, "INVALID_STATE", message)


def priority_cap():
    return ApiError(409, "PRIORITY_CAP_EXCEEDED", "You can only have 3 priorities. Move one first.")


def undo_expired():
    return ApiError(409, "UNDO_EXPIRED", "Too late to undo.")


def upstream_unavailable(message: str = "Google is not reachable. Your changes are saved in DayGraph."):
    return ApiError(503, "UPSTREAM_UNAVAILABLE", message)
