# DayGraph backend

    pip install -r requirement.txt
    python main.py              # http://localhost:8000  (API under /api)
    python scripts/demo_ingest.py   # mock: review badge 0 -> 3
    python -m pytest -q         # tests

Modes live in `data/config/config.ini` under `[daygraph]`: `google_mode` and `llm_mode` (`mock` by default). Set `JWT_SECRET` in the environment for any non-mock run.
