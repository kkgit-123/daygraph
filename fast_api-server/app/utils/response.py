from app import constant
from fastapi.responses import JSONResponse

default_response = 500
default_error_message = constant.SOMETHING_WENT_WRONG

def set_response(status_code: int = default_response, status_message: str = default_error_message, data: dict = None):
    content = {
        "data": data if data is not None else {},
        "status_code": status_code,
        "status_message": status_message
    }
    return JSONResponse(content=content, status_code=status_code)

