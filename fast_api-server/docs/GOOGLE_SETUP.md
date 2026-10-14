# Google setup (live mode)

Mock mode needs none of this. Follow these steps to run DayGraph against real Google Workspace.

## 1. Enable the APIs

Run in Cloud Shell (replace the project id):

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable calendar-json.googleapis.com tasks.googleapis.com meet.googleapis.com \
  drive.googleapis.com docs.googleapis.com admin.googleapis.com workspaceevents.googleapis.com \
  pubsub.googleapis.com aiplatform.googleapis.com generativelanguage.googleapis.com secretmanager.googleapis.com
```

## 2. OAuth consent screen and client

1. APIs & Services → OAuth consent screen. Choose **Internal** (your Workspace domain only).
2. Scopes: `openid`, `email`, `calendar.readonly`, `tasks`, `meetings.space.readonly`, `drive.readonly`. Check each against the current Google docs before release.
3. APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
4. Authorised redirect URI: `http://localhost:5555/api/auth/google/callback` (must match `redirect_uri` in `config.ini`).
5. Copy the client ID and secret into `[google_oauth]` in `data/config/config.ini`.

## 3. Encryption key for stored tokens

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Put the output in `[security] fernet_key`, or export it as `FERNET_KEY`. Never commit it. Losing it means every user reconnects.

## 4. Switch modes

In `config.ini`:

```ini
[daygraph]
google_mode = live
llm_mode = live
```

Also set `JWT_SECRET` (or `[security] jwt_secret`) to a long random value. Live mode refuses to start without it.

## 5. Connect services

Sign in, open **Settings**, and press **Connect** on each service. Google shows the consent screen once per service. Disconnecting removes the stored token.

## What works in live mode

- Calendar: today's events and free/busy (working hours minus meetings).
- Tasks: create, complete and delete. Each DayGraph task keeps its `google_task_id`, so retries do not duplicate it.

## Not built yet

- Meet transcripts, Drive and the directory (DG-L04, DG-L05). Manual paste still works.
- Pub/Sub push webhook for Workspace Events (DG-L06). Transcripts are not picked up automatically.

If the app cannot reach Google, it keeps working from its own data and shows **Reconnect Google** in the sidebar.
