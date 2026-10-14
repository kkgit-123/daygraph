# DayGraph demo script (screen recording)

Mock mode. No Google keys needed. Record at 1440 px wide in a full browser window.

## Before you record

1. Start the API: `cd fast_api-server && ./fast_run.sh` (port 5555).
2. Start the app: `cd ui-server-vite && npm run dev` (port 3005). Open http://localhost:3005.
3. Reset to the sample story: sign in, open **Settings**, press **Reset demo data**. Do this before every take.
4. Toasts stay for about 3 seconds. Pause after each one so it appears on screen.

The story: the Payments launch was set for 1 Nov on 3 Oct. On 9 Oct the team moved it to 15 Nov. DayGraph spots that conflict and waits for a person to decide.

---

## Part A: Developer (Aiko Tanaka)

**A1. Sign in (30 s).** On the login page press **Continue as Aiko Tanaka · Developer**.

**A2. Today (2 min).**
- Point at the stat strip: decisions, tasks, meetings and the conflict note.
- Top 3 priorities. Tick one. The title strikes through at once.
- Press **Replan day**. The focus block moves 15 minutes and the button becomes **Undo replan**. Press it to undo.
- **Also today**: type a task and press Enter. It appears in the list.
- **Scratchpad**: type a few words. Wait for "Saved just now". Switch between **This day** and **Everywhere**.
- **Ideas**: type "Batch webhook retries behind a queue" and press Enter. Press **Make a task** on an idea.
- **Saved reading**: paste a link and press Save. Press **Remove** on it.
- Schedule: point at the ended meeting with its "decisions to review" chip. Click it to go to Review.
- Use the day arrows to step to another day, then come back.

**A3. Review (3 min).**
- Meeting header: "Accept the N without conflicts" for the easy decisions.
- Conflict card (Launch date): read the Earlier and Proposed panels and the rationale.
  - Press **Accept and replace the 3 Oct decision** (if it is still pending after the earlier steps). It moves to accepted with its message.
  - Press **Undo** on that row. It returns to pending.
  - Press **Keep both** on the conflict. The row is marked kept both.
- Owner card: pick one of the two Aikos. The owner note changes to "Confirmed by you".
- Press **Dismiss** on a card. It shows in the audit list, then press **Undo**.
- **How DayGraph checked this**: point at the five check lines.
- **Pause analysis**, then **Resume analysis**.

**A4. Ask (2 min).**
- Press `/` anywhere. The Ask field gets focus.
- Click a suggestion. Read the answer and its numbered citations.
- Click citation 2. The source pane shows the passage, the access note and the CTA.
- Ask: "What did I save about retry strategies?" The idea you captured appears as a citation.
- Press **Ask something else** to reset.

**A5. Decision graph (1 min).**
- Click a decision node. The detail panel opens.
- Use the **Show** toggles: meetings, tasks, people, and relationship names.
- Point at the legend and at the dashed conflict edge, if it is still pending.

**A6. Settings (1 min).**
- Change working hours: type a new end time and tab away. A "Working hours saved." toast appears.
- Turn **Sync focus blocks** on, then off.
- Connections: press **Disconnect** on Google Tasks, then **Connect**. In mock mode this is a toggle.
- **Export my data** downloads a JSON file. Show it briefly.
- **Delete my account**: press it, then **Cancel**. Do not confirm in the recording.

---

## Part B: Manager (Mei Chen, team lead)

Reset demo data first, or sign out and start from the login page.

**B1. Sign in (30 s).** Press **Continue as Mei Chen · Team lead**. The **Team** item appears in the sidebar.

**B2. Team (3 min).**
- Four stat tiles: decisions this week, open conflicts, tasks done, meetings analysed.
- People this week: one row per person with a progress bar, focus line and status chip. Jin-woo shows **Waiting on you**.
- Weekly brief: read it aloud.
- Waiting on you: click Jin-woo's item. It opens Review.

**B3. Review as manager (2 min).**
- Show the conflict card and how DayGraph checked it.
- Press **Accept and replace**. The team view and the badge update when you go back.

**B4. Decision graph (1 min).** Open **Open decision graph** from the Team page. Click a node.

**B5. Ask (1 min).** Ask "Why did we change the launch date?" and open citation 2.

**B6. Sign out (20 s).** Open **Settings**, press **Sign out**.

---

## Notes for the recording

- The Team page is a demo view. Its numbers and text come from `fixtures/team.json` and do not change with the data. Everything else reads the database.
- Mei's Review and Ask answers come from the same sample meetings as Aiko's. Check on a dry run whether a decision Mei accepts still shows as pending for Aiko, and adjust the script if it does.
- Live Google mode is not part of this demo. The **Mock data** chip in the top bar confirms the mode.
- Reset between parts A and B if you want the conflict to start pending again.
