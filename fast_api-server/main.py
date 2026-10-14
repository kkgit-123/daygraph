import uvicorn
from app import init_app
from config import get_config

app = init_app()

if __name__ == "__main__":
    app_config = get_config()
    APP_HOST = app_config["app"]["host"]
    APP_PORT = int(app_config["app"]["port"])
    uvicorn.run("main:app", host=APP_HOST, port=APP_PORT, reload=True)

