# Known gaps (stubbed or not built)

- **Live Google / Gemini (DG-L01–L08).** Built: OAuth with PKCE and per-service consent (`apis/google_auth.py`), encrypted refresh tokens (`services/token_store.py`), live Calendar and Tasks with retries and a circuit breaker (`adapters/google/`). Not built: Meet transcripts (DG-L04), Drive and directory (DG-L05), Pub/Sub webhook and watch renewal (DG-L06), daily token budget for Gemini (DG-L01). None of the live code has run against real Google, and the OAuth state lives in process memory (one server process only).
- **Link fetching (DG-B18).** Links are saved as `metadata_only` (title from the host). No page fetch, summary, or takeaways yet. URL checks cover scheme, literal private/loopback/link-local/metadata addresses, and DNS in live mode. Redirect checks are not implemented.
- **Idempotency-Key (DG-B07).** Not implemented.
- **Global rate limit 60/min (DG-B09).** Only Ask (10/min) and link saves (30/min) are limited. The limiter is in-process.
- **Impact (DG-B19).** Mock reads `fixtures/impact.json`. Live does not compute from `impact_events` yet.
- **Notes/Ideas/Links per-scope search.** Indexed for Ask, but Ask results are not yet filtered by `scope` beyond the kind mapping.
- **Post-MVP (not started):** manager dashboard, Chat, Gmail, Jira, voice, multi-tenant.
- **Tests.** Permission, planner, verifier, owner, and conflict flows are covered. The DG-Q02 eval set and the Playwright flows are not.
- **Folder layout.** The `backend/` monorepo move from the Build Spec is not done, per TASKS.md.

## Update: remaining gaps after E1–E4 and E9

- E11 live Google and Gemini (DG-L01–L08) is not built: `LiveGateway` still raises `UpstreamUnavailable`. OAuth, Pub/Sub and Drive wiring wait for the keys above.
- GeminiLLM has not been run against a real key; the Vertex option is wired but untested.
- E12 polish (security suite, eval set, Playwright, axe, responsive checks) is not built.
- E10 Settings page (DG-F51) is still a placeholder.

## Update: E10 and E11 pass

- DG-F51 Settings and DG-F52 404 and error boundary are built. Settings tests are not written.
- DG-L02, DG-L03 and DG-L07 are built but untested against real Google. See docs/GOOGLE_SETUP.md.
- DG-L04, DG-L05, DG-L06 and the DG-L01 token budget are not built.
- Login (DG-F50) still shows the dev button in live mode. The live "Sign in with Google" flow is not built.
