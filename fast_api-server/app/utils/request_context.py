import contextvars
import logging
import uuid

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

_old_factory = logging.getLogRecordFactory()


def _factory(*args, **kwargs):
    record = _old_factory(*args, **kwargs)
    record.request_id = request_id_var.get()
    return record


def install_log_factory():
    """Every log record gets a request_id attribute (the X-Request-ID of the current request)."""
    logging.setLogRecordFactory(_factory)


def new_request_id() -> str:
    return uuid.uuid4().hex[:16]
