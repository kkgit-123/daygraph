# DayGraph backend: decisions and assumptions

- **Layout kept.** `fast_api-server/` stays as is (no monorepo move). Port is **8000** in `data/config/config.ini`, matching `VITE_API_BASE_URL` and the frontend.
- **Envelope.** Every response is `{data, status_code, status_message}`. Errors carry `data.code` (e.g. `PRIORITY_CAP_EXCEEDED`). Validation errors add `data.errors[]`.
- **Ids.** Prefixed ULIDs from one helper (`app/utils/ids.py`).
- **Clock.** Mock mode starts at `mock_now` (2026-10-09 10:15 Tokyo) and then advances with real time, so the undo window still works.
- **Auth.** `POST /api/auth/dev-login` (mock only, 404 otherwise). JWT secret comes from `JWT_SECRET`; a dev-only fallback is used in mock mode only. `user_id` is never accepted from the client.
- **Three-priority rule.** Enforced by a partial unique index on `tasks(owner_id, plan_date, priority_slot)` plus a `CHECK`. The integrity error is mapped to 409.
- **Replan.** The slip is absorbed by the latest unstarted block that still fits, so only `blk_3` moves 16:00 → 16:15 (spec DG-B14). Earlier blocks stay put.
- **Owner scoring.** A first-name match among attendees scores 0.7; with the addressed bonus it is 0.8. That is not below the 0.8 check line, so no owner check is raised. The spec's "Dewi > 0.9" acceptance is ambiguous, so this follows the scoring rules.
- **Quote verifier.** Latin quotes must keep every word, so one changed word fails. CJK quotes use a fuzzy partial ratio (≥ 0.90) after NFKC and punctuation stripping.
- **Meeting load.** Calendar minutes total 105 (not 120 as in the spec's example), so the label reads 19% against PROTO's 22%. The calendar fixture follows the spec's times exactly.
- **Badge vs. seed.** The seed already holds the three decisions (review count 3). `scripts/demo_ingest.py` clears that meeting's decisions and re-runs the pipeline, so the badge goes 0 → 3 through real ingestion.
- **Graph default topic.** The visible topic with the most decisions (ties go to the newest), which is the launch topic in the seed.
- **Accept all.** Accepts only non-conflict cards without an owner check (seed: one card, dec_c2).
- **Google writes.** Written after commit by the in-process job runner (3 attempts, backoff). DayGraph's row is the source of truth, and `synced` is false until a write succeeds.

## Update: E1–E4 and E9 closed

- Review time (`/impact`, live) is estimated: each review action (accept, keep both, dismiss) counts as 30 seconds. It is not measured.
- Live impact "decisions captured" counts visible, non-dismissed decisions (seed: 5).
- Idempotency-Key replays the first stored response for 24 h on `POST /tasks` and `POST /decisions/{id}/accept`.
- Saved links fetch only in live mode, through `url_safety.fetch` (every redirect hop is validated, 5 MB cap, 5 redirects, 15 s). Mock mode saves `metadata_only`.
- Manual ingest of a doc link works in mock mode only for the sample transcript link; other links return 503 until live Drive (DG-L05).
- Live mode shows at most four people in the graph, ranked by displayed meetings attended.
- Keys to fill later in `data/config/config.ini`: `[security] jwt_secret`, `fernet_key`; `[google_oauth] client_id`, `client_secret`, `allowed_domain`; `[gcp] project_id`, `use_vertex`, `pubsub_topic`, `pubsub_audience`; `[gemini] api_key`. Empty means not configured.
