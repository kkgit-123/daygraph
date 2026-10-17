# DayGraph

A Google-native work intelligence app. It turns Google Meet transcripts into **decisions and tasks**, links them in a **work graph**, and answers questions with **cited sources**. A "My Day" cockpit shows your priorities, schedule and conflicts in one place.

- **Backend:** `fast_api-server/` – FastAPI (Python)
- **Frontend:** `ui-server/` – React + Vite + Tailwind

## Google services and features

| Google service | What DayGraph uses it for |
|---|---|
| **Gemini** (Gemini API / **Vertex AI**) | Extracts decisions, tasks and owners from transcripts, detects conflicting decisions, and writes cited answers. Uses `gemini-2.5-flash`, `gemini-2.5-pro` and `gemini-embedding-001`. |
| **Google Meet** (Meet API) | Source of meeting transcripts. |
| **Google Calendar** | Builds the day's schedule and links meetings to decisions. |
| **Google Tasks** | Reads and writes your tasks. |
| **Google Drive and Docs** | Pulls meeting notes and documents as extra context. |
| **Workspace Events and Cloud Pub/Sub** | Pushes a webhook when a new transcript is ready, so ingestion is automatic. |
| **Google Sign-In (OAuth 2.0)** | Login restricted to your Workspace domain. Refresh tokens are stored encrypted. |

Key product features:
- Transcript to decision cards, saved as **proposed** until a person accepts them (with undo).
- Conflict detection, for example a payments launch date moving from 1 Nov to 15 Nov.
- Ask page: answers carry citations, and uncited sentences are dropped.
- Graph page showing how people, meetings, decisions and tasks connect.
- Permission-aware: users only see what they own or attend.
- **Mock mode:** the whole app runs offline with seeded demo data and no Google account.

## Run locally

You need Python 3.11+ and Node 18+.

### 1. Backend

```bash
cd fast_api-server
python3 -m venv venv && source venv/bin/activate
pip install -r requirement.txt
uvicorn main:app --host 0.0.0.0 --port 5556 --reload
```

The API is at `http://localhost:5556/api`.

### 2. Frontend

In a second terminal:

```bash
cd ui-server-vite
npm install
```

Create `ui-server-vite/.env`:

```
VITE_API_BASE_URL=http://localhost:5556
PORT=3009
```

Then start it:

```bash
npm run dev
```

Open `http://localhost:3009`.

That's it. The app starts in **mock mode** by default, so you don't need any keys.

## Run with real Google and Gemini (optional)

Edit `fast_api-server/data/config/config.ini`:

```ini
[daygraph]
google_mode = live
llm_mode = live

[google_oauth]
client_id = ...
client_secret = ...
redirect_uri = http://localhost:5556/api/auth/google/callback
allowed_domain = yourcompany.com

[gemini]
api_key = ...          ; or set [gcp] use_vertex = true and project_id

[security]
jwt_secret = ...
```

Also set `frontend_origins` and `frontend_url` to your frontend URL. Full steps, including the `gcloud services enable` command, are in [fast_api-server/docs/GOOGLE_SETUP.md](fast_api-server/docs/GOOGLE_SETUP.md).

> Never commit real keys or secrets. Keep `config.ini` secrets out of GitHub.

## Tests

```bash
cd ui-server-vite && npm test      # frontend (Vitest)
cd fast_api-server && pytest       # backend
```

## More docs

See `fast_api-server/docs/` for the demo script, design decisions and known gaps.