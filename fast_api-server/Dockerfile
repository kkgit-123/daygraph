
FROM python:3.9-slim-buster

WORKDIR /api-server

COPY requirement.txt .

RUN pip install --no-cache-dir -r requirement.txt

COPY . .

EXPOSE 8000

ENV HOST 0.0.0.0

ENV PORT 5000

CMD ["uvicorn", "main:app", "--host", "${HOST}", "--port", "${PORT}"]