"""Live Google Workspace gateway (DG-L03, DG-L04, DG-L05).

Built: Calendar, Tasks, Meet transcripts, Drive docs and Docs text. Each call uses the viewer's own refresh token
and runs through adapters/google/resilience.py.
Not built: the Admin directory (needs a domain admin token). It raises UpstreamUnavailable. See docs/KNOWN_GAPS.md.
"""
import re
from datetime import datetime, time as dtime, timedelta
from zoneinfo import ZoneInfo

import httplib2
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from google_auth_httplib2 import AuthorizedHttp
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import config
from app.adapters.google import resilience
from app.adapters.google.base import GoogleGateway, UpstreamUnavailable
from app.services import clock, token_store
from app.utils.logger_config import get_logger

logger = get_logger(__name__)

TOKEN_URI = "https://oauth2.googleapis.com/token"
HTTP_TIMEOUT_SECONDS = 10
TASKLIST = "@default"
# Google API name -> (version, OAuth connection it uses). Docs reuses the Drive consent.
GOOGLE_APIS = {
    "calendar": ("v3", "calendar"),
    "tasks": ("v1", "tasks"),
    "meet": ("v2", "meet"),
    "drive": ("v3", "drive"),
    "docs": ("v1", "drive"),
}
DOC_URL = re.compile(r"/document/d/([A-Za-z0-9_-]+)")


def _client_credentials() -> tuple[str, str]:
    oauth = config.get_config().get("google_oauth", {})
    return oauth.get("client_id", "").strip(), oauth.get("client_secret", "").strip()


def _zone() -> ZoneInfo:
    return ZoneInfo(clock.tz_name())


def _minutes(dt: datetime) -> int:
    return dt.hour * 60 + dt.minute


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


class LiveGateway(GoogleGateway):
    mode = "live"

    def _run(self, user_id: str, api: str, fn):
        """Builds an authorised client for this user and runs fn(client) through the resilience layer."""
        version, connection = GOOGLE_APIS[api]
        try:
            refresh = token_store.load(user_id, connection)
        except token_store.NotConfigured as exc:
            raise UpstreamUnavailable("Google is not set up on this server. See docs/GOOGLE_SETUP.md.") from exc
        if not refresh:
            raise UpstreamUnavailable("Google is not connected. Reconnect Google.")
        client_id, client_secret = _client_credentials()

        def attempt():
            creds = Credentials(None, refresh_token=refresh, token_uri=TOKEN_URI, client_id=client_id, client_secret=client_secret)
            http = AuthorizedHttp(creds, http=httplib2.Http(timeout=HTTP_TIMEOUT_SECONDS))
            return fn(build(api, version, http=http, cache_discovery=False))

        try:
            return resilience.call(connection, attempt)
        except RefreshError as exc:
            # invalid_grant: the user revoked access or the token expired. The sidebar then shows Reconnect Google.
            token_store.mark_error(user_id, connection)
            raise UpstreamUnavailable("Google access expired. Reconnect Google.") from exc

    # ---- Calendar ----
    def _day_bounds(self, date: str):
        start = datetime.combine(datetime.fromisoformat(date).date(), dtime.min, tzinfo=_zone())
        return start, start + timedelta(days=1)

    def calendar_events(self, user_id, date):
        start, end = self._day_bounds(date)

        def fetch(svc):
            return svc.events().list(calendarId="primary", timeMin=start.isoformat(), timeMax=end.isoformat(),
                                     singleEvents=True, orderBy="startTime", maxResults=250).execute()

        events = []
        for item in self._run(user_id, "calendar", fetch).get("items", []):
            if "dateTime" not in item.get("start", {}):
                continue  # all-day events do not block time
            s = _parse(item["start"]["dateTime"]).astimezone(_zone())
            e = _parse(item["end"]["dateTime"]).astimezone(_zone())
            events.append({"id": item["id"], "title": item.get("summary") or "Busy",
                           "start_min": _minutes(s), "end_min": _minutes(e), "meeting_id": None})
        return events

    def free_busy(self, user_id, date):
        start, end = self._day_bounds(date)
        body = {"timeMin": start.isoformat(), "timeMax": end.isoformat(), "items": [{"id": "primary"}]}

        def fetch(svc):
            return svc.freebusy().query(body=body).execute()

        busy = self._run(user_id, "calendar", fetch).get("calendars", {}).get("primary", {}).get("busy", [])
        return [(_minutes(_parse(b["start"]).astimezone(_zone())), _minutes(_parse(b["end"]).astimezone(_zone()))) for b in busy]

    # ---- Tasks ----
    def create_task(self, user_id, title, due=None, notes=None):
        body = {"title": title}
        if notes:
            body["notes"] = notes
        if due:
            body["due"] = f"{due}T00:00:00.000Z"  # Google Tasks keeps the date only

        def fetch(svc):
            return svc.tasks().insert(tasklist=TASKLIST, body=body).execute()["id"]

        return self._run(user_id, "tasks", fetch)

    def complete_task(self, user_id, google_task_id):
        def fetch(svc):
            try:
                svc.tasks().patch(tasklist=TASKLIST, task=google_task_id, body={"status": "completed"}).execute()
            except HttpError as exc:
                if exc.resp.status != 404:  # already gone: nothing to complete
                    raise

        self._run(user_id, "tasks", fetch)

    def delete_task(self, user_id, google_task_id):
        def fetch(svc):
            try:
                svc.tasks().delete(tasklist=TASKLIST, task=google_task_id).execute()
            except HttpError as exc:
                if exc.resp.status != 404:  # idempotent: a missing task counts as deleted
                    raise

        self._run(user_id, "tasks", fetch)

    # ---- Meet transcripts (DG-L04) ----
    def get_transcript(self, user_id, conference_ref):
        """conference_ref is 'conferenceRecords/{id}'. Returns transcript lines with speaker names and offsets."""
        def fetch(svc):
            records = svc.conferenceRecords()
            transcripts = records.transcripts().list(parent=conference_ref).execute().get("transcripts", [])
            if not transcripts:
                return []
            start_iso = records.get(name=conference_ref).execute().get("startTime")
            origin = _parse(start_iso) if start_iso else None
            names: dict[str, str] = {}
            lines, token = [], None
            while True:
                page = records.transcripts().entries().list(parent=transcripts[0]["name"], pageSize=100, pageToken=token).execute()
                for entry in page.get("transcriptEntries", []):
                    who = entry.get("participant", "")
                    if who not in names:
                        names[who] = self._participant_name(svc, who)
                    offset = int((_parse(entry["startTime"]) - origin).total_seconds()) if origin and entry.get("startTime") else 0
                    lines.append({"idx": len(lines), "speaker_id": None, "speaker_name": names[who],
                                  "offset_sec": max(offset, 0), "text": entry.get("text", "").strip()})
                token = page.get("nextPageToken")
                if not token:
                    break
            return [line for line in lines if line["text"]]

        return self._run(user_id, "meet", fetch)

    @staticmethod
    def _participant_name(svc, participant: str) -> str:
        try:
            p = svc.conferenceRecords().participants().get(name=participant).execute()
        except HttpError:
            return "Unknown"
        for key in ("signedinUser", "anonymousUser", "phoneUser"):
            if p.get(key, {}).get("displayName"):
                return p[key]["displayName"]
        return "Unknown"

    # ---- Drive and Docs (DG-L05) ----
    def drive_docs(self, user_id):
        def fetch(svc):
            return svc.files().list(q="mimeType='application/vnd.google-apps.document' and trashed = false",
                                    fields="files(id,name,modifiedTime,webViewLink)", pageSize=50,
                                    orderBy="modifiedTime desc").execute()

        return [{"id": f["id"], "title": f["name"], "url": f.get("webViewLink"), "edited_at": f.get("modifiedTime")}
                for f in self._run(user_id, "drive", fetch).get("files", [])]

    def document_text(self, user_id, url):
        match = DOC_URL.search(url or "")
        if not match:
            raise UpstreamUnavailable("That is not a Google Doc link.")
        doc_id = match.group(1)

        def fetch(svc):
            return svc.documents().get(documentId=doc_id).execute()

        body = self._run(user_id, "docs", fetch).get("body", {}).get("content", [])
        parts = []
        for block in body:
            for el in block.get("paragraph", {}).get("elements", []):
                parts.append(el.get("textRun", {}).get("content", ""))
        return "".join(parts).strip()

    # ---- not built: needs a domain admin token ----
    def directory(self):
        raise UpstreamUnavailable("The company directory is not connected in live mode yet.")
