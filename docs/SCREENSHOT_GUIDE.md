# Assignment 02 screenshot guide

Run the seed first and keep screenshots free of `.env` files, database credentials and real contact information. Use a consistent desktop viewport (e.g. 1440 × 1000) and include a mobile example (390 × 844). Capture successful persisted outcomes, not just empty forms.

## Member 1 — Incident Management

| Screen                | Suggested caption                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Ranger Dashboard      | The ranger workspace connects assigned patrols, open alerts and incident reporting.                 |
| Report Incident Form  | The ranger selects an incident type and confirms coordinates, with optional notes and a photograph. |
| Incident Confirmation | The API confirms that the incident was saved and displays its synchronization label.                |
| Incident History      | The ranger sees their own saved reports and review statuses.                                        |
| Manager Incident View | The manager reviews the same report and updates its status to Under Review or Resolved.             |

Demonstrate one report with Simulate Offline enabled. Caption it accurately: “Pending Sync is a simulated label; this report is already saved in MongoDB.”

## Member 2 — GPS Collar / High-Risk Zone Alert

| Screen                    | Suggested caption                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Animal Tracking Dashboard | Seeded animals display collar health, last transmission and last known coordinates.  |
| Collar Details            | The selected collar shows its persisted location-reading history.                    |
| Simulate Reading          | A manager submits a mock collar reading at the Village Boundary Zone centre.         |
| High Risk Alert           | The backend detects a circular risk-zone entry and records an animal-linked alert.   |
| Alert Acknowledgement     | A ranger or liaison officer acknowledges the alert with responder identity and time. |

Also capture a safe reading with “no alert generated.” Repeat the risk reading to show one unresolved alert being updated. Resolve it as manager if a fresh New alert is needed for screenshots.

## Member 3 — Patrol Management

| Screen            | Suggested caption                                                                 |
| ----------------- | --------------------------------------------------------------------------------- |
| Create Patrol     | The manager creates a named route with park, schedule and checkpoint coordinates. |
| Assign Ranger     | The same form assigns the route to a registered ranger.                           |
| Ranger My Patrols | The assigned route appears in the ranger’s patrol list.                           |
| Active Patrol     | Starting the patrol records its start time and enables waypoint capture.          |
| Record Waypoint   | The ranger saves GPS coordinates, observation type and optional notes/photo.      |
| Patrol Summary    | Ending the patrol records its outcome, duration and complete waypoint history.    |

For the alternate flow, choose Incomplete and Weather, then capture the reason in the summary. Assignment and creation are intentionally one integrated form.

## Member 4 — Community Reporting

| Screen                                | Suggested caption                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| Community Home                        | Public reporting is accessible without a staff account.                                       |
| Elephant Report Form                  | The public form requests a landmark and a positive elephant count.                            |
| Completed Form                        | A sample sighting includes movement direction, optional GPS coordinates and description.      |
| Confirmation                          | The saved report returns a reference without exposing the reporter’s private contact details. |
| Manager/Liaison Community Report View | Authorized staff review the sighting, update its status and record a response action.         |

Use a fictitious landmark/contact. Capture the response history showing officer and time. Action logging does not demonstrate an actual SMS message or automatic dispatch.

## Shared screenshots

- Manager dashboard: all four use cases in one view with database-derived counts.
- Login: authenticated access for the three seeded roles.
- Mobile navigation: hamburger menu and a readable single-column form.
- Validation: a friendly message or browser field prompt preventing invalid data.
- Test/build output: successful automated checks, with no secrets visible.
