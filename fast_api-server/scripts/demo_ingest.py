"""Demo: the Review badge goes 0 -> 3 when the seeded Payments launch sync is run through the pipeline.

    python scripts/demo_ingest.py [http://localhost:8000]

Mock mode only. Clears the meeting's decisions, runs ingestion, prints the badge count.
"""
import json
import sys
import time
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000") + "/api"


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["data"]


def main():
    token = call("POST", "/auth/dev-login", body={"user": "aiko"})["access_token"]
    call("POST", "/dev/clear_decisions/mtg_pls", token)
    print("badge before:", call("GET", "/me", token)["review_count"])
    call("POST", "/meetings/mtg_pls/process", token)
    for _ in range(40):  # ingestion runs in the background; wait for it to finish
        if call("GET", "/meetings/mtg_pls", token)["meeting"]["status"] in ("PROCESSED", "FAILED"):
            break
        time.sleep(0.25)
    print("badge after: ", call("GET", "/me", token)["review_count"])


if __name__ == "__main__":
    main()
