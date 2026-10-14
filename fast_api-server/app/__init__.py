import logging
import os
from logging import config

import yaml
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.storage.db import get_connection
from app.utils.handlers import general_exception_handler, http_exception_handler, validation_exception_handler
from app.utils.request_context import new_request_id, request_id_var
from app.utils.startup_checks import ensure_paths_exist

# -------------- Setup logging --------------

with open('logging.conf') as f:
    log_config = yaml.load(f.read(), Loader=yaml.FullLoader)
    logging.config.dictConfig(log_config)

logger = logging.getLogger(__name__)


def init_app():
    # -------------- Setup App Config --------------
    from config import get_config
    app_config = get_config()
    url_prefix = app_config["app"]["url_prefix"]
    dg = app_config.get("daygraph", {})

    app = FastAPI(title="DayGraph API")

    origins = [o.strip() for o in dg.get("frontend_origins", "http://localhost:3005").split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=".*",  # dev: allow every origin (echoed back, so credentials still work)
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_id_middleware(request, call_next):
        rid = request.headers.get("X-Request-ID") or new_request_id()
        token = request_id_var.set(rid)
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers["X-Request-ID"] = rid
        return response

    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # -------------- Register Routers --------------

    from app.apis import ROUTERS

    for router in ROUTERS:
        logger.debug(f'Registering router: {router}')
        if url_prefix:
            app.include_router(router, prefix=url_prefix)
        else:
            app.include_router(router)

    logger.debug("Checking Folder Paths ")
    paths_to_check = []
    if 'paths' in app_config:
        for key, value in app_config["paths"].items():
            full_path = os.path.join(os.path.dirname(__file__), value)
            paths_to_check.append(full_path)
    ensure_paths_exist(paths_to_check)

    logger.debug("Checking Database")
    from app.services.seed import seed_if_empty

    conn = get_connection()
    try:
        if seed_if_empty(conn):
            logger.info("Seeded an empty database with the DayGraph sample data")
    finally:
        conn.close()

    return app
