# DayGraph: Google hackathon demo script (5 minutes)

Theme: AI that improves how people access knowledge, collaborate, make decisions and complete everyday work.
Direction we hit: meeting intelligence, enterprise knowledge assistant, workflow automation.

## The one-sentence pitch

"Teams decide things in meetings, then lose them. DayGraph reads the Google Meet transcript, extracts each decision with a word-for-word quote, catches when a new decision contradicts an old one, turns accepted decisions into Google Tasks, and lets anyone ask 'why did we decide this?' and get an answer with a source."

## Be honest about what runs

Say this up front, in one breath: "This demo runs on a recorded sample workspace so it works offline. The Google connections (OAuth, Calendar, Tasks, Meet, Drive, Pub/Sub) and Gemini on Vertex AI are built and configured, and switch on with one setting."

Do not claim: live Google data in this demo, measured time savings, Cloud Run deployment, BigQuery, Document AI, Agent Engine, or Vertex AI Search. None of those are built. The live Google code has not been run against real Google yet.

## Before you record

1. API: `cd fast_api-server && ./fast_run.sh`. App: `cd ui-server-vite && npm run dev`, open http://localhost:3005.
2. Sign in, open **Settings**, press **Reset demo data**.
3. For the "decisions appear" moment, run this in a second terminal just before Scene 2, then reload:
   `python scripts/demo_ingest.py http://localhost:5555`
   This clears the 9 Oct meeting's decisions and runs the real pipeline, so the Review badge goes from 0 to 3 on camera. If you skip it, the badge already shows 3.
4. Browser at 1440 px wide. Hide bookmarks. Close other tabs.

## The story the data tells

On 3 Oct the Payments team decided to launch on 1 Nov. On 9 Oct, in a mixed English and Japanese meeting, someone said the launch moves to 15 Nov. Nobody updated anything. The developer would have built to the wrong date.

---

## Scene 1: The problem (30 s). Screen: slide or the login page

Say: "Every team has this problem. A decision made on 3 Oct gets quietly replaced on 9 Oct. The person building the feature never hears. Notes are scattered across Meet, Docs and chat."

Show: login page. Press **Continue as Aiko Tanaka · Developer**.

Google callout: "Sign-in uses Google OAuth with PKCE, restricted to the company's Workspace domain."

## Scene 2: Meeting to decisions (60 s). Screen: Review

Show the Review page for "Payments launch sync".

Highlight, in this order:
1. The five **How DayGraph checked this** lines on the right. Say: "Every decision is checked against the transcript."
2. A decision card. Point at the quote and the green **Verified in transcript** chip. Say: "Gemini proposes the decision. Our code then confirms the quote exists word for word. If it does not, the decision is dropped. The model cannot invent a quote."
3. The Japanese decision with its English translation. Say: "Gemini handles the mixed-language meeting."
4. The owner card with two people named Aiko. Press the right one. Say: "When two people share a name, DayGraph asks instead of guessing."

Google callout: "Gemini on Vertex AI does extraction, translation and owner matching. Transcripts come from the Google Meet API."

## Scene 3: The conflict (60 s). Screen: Review, conflict card

Highlight:
1. The **Earlier decision** (1 Nov) and **This decision, today** (15 Nov) side by side, and the "14 days later" label.
2. The rationale line.
3. Press **Accept and replace the 3 Oct decision**. Toast appears. The row turns green.
4. Point at the sidebar **Review badge** dropping. Say: "Nothing changed without a person's click. The AI proposes, the human decides."
5. Press **Undo** once to show it is reversible, then accept again.

Say: "Gemini only chooses from candidates our code supplies. It cannot invent a decision to conflict with."

## Scene 4: Decisions become work (60 s). Screen: Today

Go to **Today**.

Highlight:
1. **Top 3 priorities**. Say: "The accepted decision created a Google Task, and the planner ranked it by deadline, who is blocked, and effort."
2. Press **Replan day**. The block moves 15 minutes. Press **Undo replan**. Say: "Focus blocks are placed around real Calendar meetings."
3. Tick a priority. It strikes through.
4. **Ideas**: type `Batch webhook retries behind a queue` and press Enter. Press **Make a task**.
5. **Saved reading**: paste `https://example.com/retry-budgets` and press Save.

Google callout: "Calendar free/busy sets the schedule. Google Tasks holds the work. Each task keeps its Google Task id, so a retry never creates a duplicate."

## Scene 5: Ask with proof (60 s). Screen: Ask

Press `/` to jump to Ask.

Type: `Why did we change the launch date?`

Highlight:
1. Numbered citations in the answer. Click citation 2.
2. The source pane: the quote, speaker, time, and the **shield line** "You attended this meeting".
3. Say: "Every sentence has a source or it is dropped. If nothing is found it says so. It never guesses."

Then type: `What did I save about retry strategies?` The idea you just captured appears as a citation. Say: "It searches decisions, Drive docs, and your private notes, ideas and saved links, but only what you are allowed to see."

Say: "Ask someone who was not in the meeting and they get 'nothing found', with no hint the meeting exists. Permissions are enforced in the query."

Google callout: "This is the retrieval layer. Today it uses Gemini embeddings. It is built behind an interface so Vertex AI Search can replace it."

## Scene 6: Decision graph (30 s). Screen: Decision graph

Highlight: the topic, the two launch decisions, the **supersedes** edge, the tasks, meetings and people. Click a node and show the detail panel. Toggle **People** and **Relationship names**.

Say: "After the accept, the graph shows the old decision as replaced. New hires can see how a decision evolved."

## Scene 7: The manager view (45 s). Screen: sign out, sign in as Mei

Press **Sign out**, then **Continue as Mei Chen · Team lead**. Open **Team**.

Highlight:
1. Stat tiles: decisions this week, open conflicts, tasks done.
2. **Jin-woo: Waiting on you**. Click it. It opens Review.
3. **Weekly brief**.

Say: "The manager sees where decisions are blocking people without reading any transcripts."

Note: the Team numbers are sample data for the demo.

## Scene 8: Privacy and close (30 s). Screen: Settings

Highlight: connections list, **Meeting analysis** switch, **Export my data**, **Delete my account**.

Say: "Users control what is read. Disconnect a service and it stops. Export or delete everything."

Close with the business impact (below) and the roadmap.

---

## Business impact (use as framing, label as estimates)

These are illustrative assumptions for a 50-person team, not measurements. Say "for example", not "we measured".

| Pain | Assumption | Effect |
|---|---|---|
| Time finding "what did we decide" | 15 min per person per week | About 12 hours per week returned to a 50-person team |
| Rework from a missed decision | One mistaken build per team per quarter, 2 days | Caught at review time instead of in testing |
| Action items lost after meetings | Common; no tracking today | Every accepted decision becomes a Google Task with an owner and date |
| New joiner ramp | Weeks to learn why things are the way they are | Searchable decision history with sources |

Safer line if challenged: "We have not measured savings yet. The design removes the three biggest causes: lost decisions, unowned actions, and unsearchable history."

## Google services map (put this on a slide)

| Need | Google service | Status |
|---|---|---|
| Understand transcripts, extract decisions, judge conflicts, answer questions | Gemini on Vertex AI | Built, not yet run against a live key |
| Meeting transcripts | Google Meet API | Built, not yet run live |
| Schedule and focus time | Google Calendar API | Built, not yet run live |
| Turn decisions into work | Google Tasks API | Built, not yet run live |
| Company knowledge | Drive and Docs APIs | Built, not yet run live |
| Know when a transcript is ready | Workspace Events API and Pub/Sub | Webhook built; subscription renewal not built |
| Secure sign-in | Google OAuth with PKCE | Built, not yet run live |
| Hosting | Cloud Run | Not deployed |
| Enterprise search | Vertex AI Search | Not used; retrieval sits behind an interface to allow it |

## Likely judge questions

- **"Does it hallucinate?"** Every decision's quote must appear in the transcript, checked by code. Every answer sentence needs a source or is dropped.
- **"Who can see what?"** Permissions are applied in the database query. Not allowed means "not found", never "forbidden".
- **"Is it live on Google?"** Not in this demo. The live path is built and documented in `docs/GOOGLE_SETUP.md`, but it has not been run against real Google yet.
- **"What would you build next?"** Deploy to Cloud Run, Vertex AI Search for retrieval, Document AI for attached files, BigQuery for team analytics, Agent Engine for follow-up agents.
- **"Why not just summarise the meeting?"** Summaries do not track whether a later decision replaced an earlier one, create owned tasks, or cite sources.

## Timing

| Scene | Seconds |
|---|---|
| 1 Problem | 30 |
| 2 Decisions | 60 |
| 3 Conflict | 60 |
| 4 Work | 60 |
| 5 Ask | 60 |
| 6 Graph | 30 |
| 7 Manager | 45 |
| 8 Privacy and close | 30 |
| Total | 6 min 15 s. Trim Scene 6 and half of Scene 4 for a 5 minute cut. |
