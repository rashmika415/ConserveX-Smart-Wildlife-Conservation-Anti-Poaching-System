# Live demonstration checklist

Start with `npm run seed` and `npm run dev`. Use separate browser profiles or log out between roles. Session storage isolates authentication by browser tab, but copied tabs may inherit an existing token; explicitly log in as the intended role.

1. **Manager login** — `manager@wildlife.lk` / `Manager123!`. Inspect the four dashboard cards and recent activities.
2. **Create patrol** — Patrol Management → Create patrol. Enter a unique route name and date/time, select Kasun Silva, add a checkpoint at latitude `6.45`, longitude `81.40`, and save.
3. **Ranger lifecycle** — log in as `ranger@wildlife.lk` / `Ranger123!`. My Patrols → new route → Start Patrol. Record a Wildlife waypoint at `6.45, 81.40` with a note. Use “Report incident on this patrol” to submit a Snare / Trap report. View its confirmation/history. Return to the active patrol, end it and inspect the summary.
4. **Early termination** — assign a second patrol as manager; as ranger start it, choose Incomplete, select Weather and confirm. The summary shows the reason.
5. **Incident review** — as manager, open the ranger’s saved incident, change status to Under Review, then Resolved. As ranger, verify the updated status.
6. **Public sighting** — open `/report` without login. Enter a landmark, 3 elephants and optional direction/GPS/photo. Submit and save the receipt reference.
7. **Community response** — log in as `officer@wildlife.lk` / `Officer123!`. Open the matching report, set Reviewing, record Monitor Situation with a note, and set Responding or Resolved. Verify the response actor/time.
8. **Collar simulation** — as manager, Animal Tracking → choose GPS-C102 → Safe test location → Simulate Collar Reading. No alert is generated. Choose Village Boundary Zone and simulate again. Open the resulting alert. Repeat the reading to verify the same open alert is updated.
9. **Acknowledgement** — as ranger or liaison, Alerts → new alert → Acknowledge alert. Confirm responder/time. As manager resolve it. Another zone-entry reading can now create a new alert.
10. **Mobile view** — at 390px width, open the menu, dashboard, incident form and public sighting form. Verify readable labels, wrapped actions and no page-level horizontal scrolling.

## Useful failure demonstrations

- Incident: omit the type or coordinates; no record should be submitted.
- Public report: zero or fractional elephant counts are rejected.
- Ranger: a second patrol cannot start while another is Active.
- Patrol: no waypoint can be added after completion; Incomplete requires a reason.
- Alert: repeated acknowledgement is rejected without changing the original responder.
- Authorization: ranger navigation omits manager operations; the API also rejects those actions.
- Sync simulation: Pending Sync does not imply an actual offline queue.

## Automated checks

`npm test` runs Jest/Supertest flows against temporary MongoDB plus Vitest/React Testing Library UI tests. `npm run test:coverage` reports coverage. `npm run build` compiles the frontend and checks backend JavaScript syntax. These checks complement the manual browser walkthrough; they do not prove real hardware, dispatch or network-offline operation.
