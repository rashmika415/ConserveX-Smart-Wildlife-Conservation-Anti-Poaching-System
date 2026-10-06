# Design critique and implementation decisions

The four substantial use cases remain in one integrated React / Express / MongoDB system. This implementation follows the current assignment request; it supersedes the older development guide where that guide describes real offline queues or simulated SMS.

1. **Native-device assumptions:** the original ranger design assumes native-device offline capabilities. A responsive website provides browser geolocation with manual coordinate fallback instead.
2. **Explicit offline simulation:** the incident form has a Simulate Offline toggle. Both modes save through the API to MongoDB. The toggle selects `Pending` or `Synced`, with `Pending Sync` clearly labeled as a demonstration. There is no local queue, service worker, automatic synchronization, or promise of operation without a network.
3. **Mocked IoT hardware:** seeded animals and collars replace physical GPS hardware. Manager-selected safe coordinates or risk-zone centres use the same backend reading service.
4. **Simple geographic detection:** Haversine distance compares readings with circular zones in metres. High/Critical zone entries generate alerts. This does not model polygon boundaries, terrain, GPS uncertainty, or predictive movement.
5. **Original responsibilities retained:** rangers report incidents and conduct patrols; managers assign patrols and oversee incidents/tracking; liaison officers review community reports and acknowledge alerts.
6. **Complete business flows:** incident submission/history/review; collar reading/detection/acknowledgement/resolution; assignment/start/waypoints/end/summary; public sighting/review/response/status are persisted end to end.
7. **Standardized navigation:** a shared role-aware sidebar becomes a hamburger menu on mobile. Public reporting remains accessible without authentication.
8. **Validation and feedback:** required inputs, bounded coordinates, positive integer herd counts, photo type/size checks, API errors, loading states, empty states and confirmations replace ambiguous outcomes.
9. **Enforced authorization:** JWT authentication, database-backed roles and server-side ranger ownership checks enforce access beyond navigation visibility. Public responses contain a receipt, not contact details.
10. **Duplicate alerts:** a partial unique database index allows only one open alert per animal/zone. Repeat readings update its location/time without discarding acknowledgement. Resolved alerts remain as history; later entry can create another alert.
11. **Patrol integrity:** transitions are conditional database updates. Only one patrol can be Active per ranger; early termination requires a predefined reason. Exact-time assignment conflicts are checked. Schedule duration/overlap planning is outside scope because planned end times are not supplied.
12. **Response traceability:** community responses store the officer and time. Selecting “Dispatch Ranger” or “Notify Nearby Community” records an action; it does not automatically assign a patrol, send SMS, or notify external services.
13. **Map honesty:** a schematic location card displays exact coordinates and zone radius. It is explicitly not to scale and is not a navigational map.
14. **Assignment scope:** local uploads, seeded users and simple dashboards prioritize the four demonstrable flows. Password recovery, staff administration, real dispatch/SMS, real IoT, ML and advanced GIS are not implemented.

## Practical limitations

- MongoDB and the API must be available for login and all saved operations.
- Local uploads require persistent disk when hosted; uploaded URLs are accessible to anyone who knows the URL. The public reporting API itself does not expose private report details.
- Sessions expire after eight hours. Tokens are stored in browser session storage and are cleared on logout. There is no central token revocation or refresh-token service.
- The simulator uses artificial safe coordinates (0, 0), outside all seeded zones. They are test coordinates, not plausible Sri Lankan animal movement.
- Dashboard alerts refresh every 30 seconds, rather than using push notifications.
- Community duplicate detection and automatic escalation are intentionally not claimed.
- This is production-style assignment software, not a deployed emergency response service.
