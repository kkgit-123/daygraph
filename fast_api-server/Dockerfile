
FROM python:3.11-slim

WORKDIR /api-server

COPY requirement.txt .

RUN mkdir -p data/logs

RUN pip install --no-cache-dir -r requirement.txt

COPY . .

EXPOSE 8080

ENV HOST 0.0.0.0

ENV PORT 8080

CMD exec gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT} --workers 1 --timeout 0 --preload --log-level debug