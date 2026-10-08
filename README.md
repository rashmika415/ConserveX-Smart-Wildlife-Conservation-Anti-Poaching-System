# ConserveX — Wildlife Conservation & Anti-Poaching Monitoring System

A mobile-friendly university assignment application connecting park managers, rangers and community liaison officers. One React frontend, one Express REST API and one MongoDB database support four substantial, independently demonstrable business flows.

## Implemented use cases

| Member | Use case                          | Complete flow                                                                                                                                                                        |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1      | Incident Management               | Ranger reports an incident with GPS/manual location and optional photo → confirmation → own history → manager review/status update.                                                  |
| 2      | GPS Collar / High-Risk Zone Alert | Manager defines a circular risk zone and simulates a collar reading → MongoDB stores movement → detection creates/updates an alert → ranger/liaison acknowledges → manager resolves. |
| 3      | Patrol Management                 | Manager creates route/checkpoints and assigns ranger → ranger starts → records waypoints/photos → completes or ends early with reason → manager views summary.                       |
| 4      | Community Reporting               | Public sighting without login → receipt → authorized staff review → response action with actor/time → status update.                                                                 |

Role-specific dashboards combine saved records, open counts and recent activity. The interface includes mobile navigation, status badges, loading/empty states, filters, confirmation dialogs and schematic coordinate cards. No paid API or hardware is required.

Staff headers include an alert notification bell. Its badge counts alerts awaiting acknowledgement (not per-user unread messages). The dropdown shows up to five open alerts, prioritizes escalated alerts, and links to alert details or the full list. It refreshes every 30 seconds, when opened, on page navigation, and when the window regains focus. Opening a notification does not acknowledge it; use the existing Ranger/CLO acknowledgement action. Resolved alerts disappear from the dropdown after refresh.

## Technology and architecture

- **Frontend:** JavaScript, React, Vite, React Router, Axios, Lucide icons, responsive CSS.
- **Backend:** JavaScript, Node.js, Express 5, Mongoose, JWT, bcryptjs, Multer, Helmet and rate limiting.
- **Database:** MongoDB, including atomic state transitions and unique indexes for one active patrol per ranger and one unresolved alert per animal/zone.
- **Tests:** Jest + Supertest + temporary MongoDB; Vitest + React Testing Library.

```text
frontend/src/
  components/       Shared inputs, feedback, maps, badges, confirmations
  context/          Authentication/session state
  hooks/            API resource loading
  layouts/          Public and role-aware staff navigation
  modules/          incidents, patrols, collars, community
  pages/            Login, public reporting, dashboards, profile
  services/         Axios client, uploads URL handling
  test/             UI and interaction tests
backend/src/
  controllers/      Authentication and four use-case controllers
  middleware/       JWT, roles, ownership, upload and error handling
  models/           Nine timestamped Mongoose models
  routes/           REST API and role policies
  services/         Patrol lifecycle, geofencing, repeatable seed
  scripts/          Seed entry point
  utils/            Validation and response helpers
backend/tests/      API integration and unit tests
backend/uploads/    Runtime local photographs (ignored by Git)
docs/               Design critique and demonstration/report guides
```

Requests follow route → authorization/validation → controller/service → Mongoose. The API returns `{ "success": true, "message": "...", "data": ... }`; errors use `success: false` and `data: null`. All business data is persisted to MongoDB. There is no in-memory fallback in the application.

## Prerequisites

- Node.js **22.12+**, npm and Git.
- A running local MongoDB server, or your own MongoDB Atlas cluster.
- Internet access for the first dependency installation and temporary MongoDB test binary download.

## Install and configure

From the repository root in PowerShell:

```powershell
npm.cmd install
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

On other shells use `npm` instead of `npm.cmd`. The `.cmd` form also works around PowerShell execution policies that block `npm.ps1`.

Edit **backend/.env** (not the tracked example) and paste the generated secret:

```dotenv
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/wildlife_conservation
JWT_SECRET=PASTE_YOUR_GENERATED_RANDOM_SECRET_HERE
```

`JWT_SECRET` must be at least 32 characters. Use a randomly generated value, not the example text. The server fails clearly if configuration is missing or MongoDB cannot connect.

For **local MongoDB**, start your installed MongoDB service before seeding. For **Atlas**, create a database user and allow your development machine in Network Access. Set `MONGODB_URI` to the Atlas connection string with a database name, for example `mongodb+srv://USER:ENCODED_PASSWORD@HOST/wildlife_conservation`. URL-encode special characters in credentials. Never commit credentials or place them in frontend variables.

**frontend/.env**:

```dotenv
VITE_API_URL=/api
```

Vite proxies `/api` and `/uploads` to `http://localhost:4000`. If you change the backend port, update the proxy in `frontend/vite.config.js` or set `VITE_API_URL=http://localhost:YOUR_PORT/api`. The older `VITE_API_BASE_URL` variable is still accepted for compatibility; `VITE_API_URL` takes precedence.

## Seed and run

```powershell
npm.cmd run seed
npm.cmd run dev
```

Open **http://localhost:5173**. API health: **http://localhost:4000/api/health**. Database readiness: **http://localhost:4000/api/ready**.

To run each workspace separately in two terminals:

```powershell
npm.cmd run dev -w backend
npm.cmd run dev -w frontend
```

The seed creates three hashed-password accounts, Elephant E-042, Elephant E-018, Leopard L-007, collars GPS-C102/GPS-C118/GPS-C207, three risk zones, assigned/completed patrols, incidents, a community sighting and an alert. Re-running fills missing examples without deleting reports or resetting existing passwords. This is an explicit demo seed; do not run it against an unrelated database.

## Demo login accounts

| Role                      | Email               | Password    |
| ------------------------- | ------------------- | ----------- |
| Park Manager              | manager@wildlife.lk | Manager123! |
| Ranger                    | ranger@wildlife.lk  | Ranger123!  |
| Community Liaison Officer | officer@wildlife.lk | Officer123! |

Community reports require no login. Staff can access their own profile; user administration/password recovery is outside assignment scope. JWT sessions expire after eight hours and are stored in session storage.

## REST API

All routes below are under `/api`. Protected requests use `Authorization: Bearer <token>`.

| Routes                                                                              | Access                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------- |
| `POST /auth/login`, `GET /health`, `GET /ready`                                     | Public                                    |
| `GET /auth/me`                                                                      | Authenticated                             |
| `GET /users`                                                                        | Manager                                   |
| `POST /incidents`                                                                   | Ranger                                    |
| `GET /incidents`, `GET /incidents/:id`, `GET /incidents/ranger/:rangerId`           | Manager; ranger restricted to own records |
| `PATCH /incidents/:id/status`                                                       | Manager                                   |
| `POST /patrols`                                                                     | Manager                                   |
| `GET /patrols`, `GET /patrols/:id`, `GET /patrols/ranger/:rangerId`                 | Manager; ranger restricted to own patrols |
| `PATCH /patrols/:id/start`, `POST /patrols/:id/waypoints`, `PATCH /patrols/:id/end` | Assigned ranger                           |
| `GET /animals`, `GET /animals/:id`, `GET /collars`, `GET /risk-zones`               | Manager                                   |
| `POST /risk-zones`                                                                  | Manager                                   |
| `POST /collar-readings`, `GET /collar-readings/:collarId`                           | Manager                                   |
| `GET /alerts`, `GET /alerts/:id`                                                    | All staff                                 |
| `PATCH /alerts/:id/acknowledge`                                                     | Ranger or liaison                         |
| `PATCH /alerts/:id/resolve`                                                         | Manager                                   |
| `POST /community-reports`                                                           | Public, rate limited                      |
| `GET /community-reports`, `GET /community-reports/:id`                              | Manager or liaison                        |
| `PATCH /community-reports/:id/status`, `POST /community-reports/:id/response`       | Manager or liaison                        |

Creation endpoints for incidents, waypoints and community reports accept JSON without a photo, or `multipart/form-data` with a `photo` field. Coordinates may be flat `latitude`/`longitude` fields or a `location` object in JSON. Community coordinates are optional as a pair. Photos accept PNG/JPEG/WebP signatures up to 5 MB; randomized names are stored under `backend/uploads` and served through `/uploads`.

On **Animal Tracking**, a manager can create a high-risk zone with a unique name, centre coordinates, radius in metres, and High or Critical risk level. The new zone appears in the simulator after saving. Choose **Simulate invalid collar ID** to demonstrate collar validation without changing stored collars. `POST /risk-zones` accepts JSON fields `zoneName`, optional `description`, `centerLatitude`, `centerLongitude`, `radius`, and `riskLevel`.

Each reading records whether its collar is inside a high-risk zone. An open alert is updated by repeated inside readings. After an alert is resolved, a new alert requires a reading outside that zone followed by a reading inside it.

The **Safe test location (outside risk zones)** option sends `{ "collarId": "GPS-C102", "simulation": "safe" }` to `POST /collar-readings`. The backend chooses coordinates outside the current High/Critical zones, including manager-created zones covering (0, 0), using the same zone snapshot and distance calculation as detection. If its bounded search cannot find a safe candidate, it returns an error without saving a reading. Ordinary readings still require valid coordinates; collar validation and manager-only access apply to both modes.

Unacknowledged alerts are automatically flagged **Escalated** after 15 minutes from first detection. Set `ALERT_ESCALATION_MINUTES` in `backend/.env` to a positive number to change the threshold, then restart the API. The API checks at startup and every 30 seconds even without viewers; alert list/detail requests also check for overdue alerts. Repeated readings do not extend the deadline. Escalation records `escalatedAt` once, preserving the existing priority and New/Acknowledged/Resolved lifecycle. The flag appears in staff dashboards and alerts, with an Escalated filter for alerts still awaiting acknowledgement. Ranger/CLO acknowledgement clears the active warning; escalation history remains after acknowledgement or manager resolution. This is an in-app flag, not SMS/email delivery.

To demonstrate escalation quickly, temporarily set `ALERT_ESCALATION_MINUTES=0.1` (six seconds), restart the API, simulate a fresh risk-zone entry, and leave it unacknowledged. Open Alerts after six seconds or wait for its 30-second refresh. Acknowledge as Ranger/CLO and verify the warning clears. Restore `15` and restart after the demo.

## Tests and build

### Run the complete Member Two demo

```powershell
npm.cmd run demo:collars
```

This one command starts a disposable local MongoDB database, the API on **4200**, and the frontend at **http://127.0.0.1:5175**. It seeds the demo users and runs real API simulations for zone creation, safe location selection (including a zone covering the origin), risk entry, concurrent duplicate prevention, invalid collar/coordinates, saved history, escalation, Ranger/CLO acknowledgement, resolution, and exit/re-entry. Each successful scenario prints `PASS`; failures stop the demo with a nonzero exit code. Ports 4200 and 5175 must be free.

Escalation uses a **six-second threshold for this demo process only**. It does not edit `.env` or connect to your configured database. After simulations, open the printed URL and use the standard demo accounts above. The script leaves a live alert and resolved/acknowledged examples for inspection. Press **Ctrl+C** to stop the services and discard the temporary data. A normal API run still uses its configured escalation threshold (15 minutes by default).

For an automated run that shuts down after checking all scenarios:

```powershell
npm.cmd run demo:collars -- --check
```

Dependencies must already be installed. Like the backend tests, this uses the local/cached MongoDB binary or downloads one on first use; `MONGOMS_SYSTEM_BINARY` can select an installed binary. The script prints the browser URL without launching a browser automatically.

```powershell
npm.cmd test
npm.cmd run test:coverage
npm.cmd run build
npm.cmd run format:check
```

For real-browser verification of all four workflows and mobile layouts:

```powershell
npm.cmd exec -- playwright install chromium
npm.cmd run test:e2e
```

The browser test harness starts a disposable MongoDB database, an API on port 4100 and Vite on port 5174, then shuts them down. It never seeds your configured database. Browser screenshots/traces are written to ignored `test-results/`. `PLAYWRIGHT_EXECUTABLE_PATH` can select an existing Chromium executable. `MONGOMS_SYSTEM_BINARY` can select an existing MongoDB executable; a local `.local/mongod.exe`, if present, is also used by test helpers.

Backend tests start an isolated local MongoDB process with `mongodb-memory-server`. They **never use `backend/.env`'s database URI**. The first run downloads a MongoDB binary; later runs use the cache. If downloads are restricted, supply your installed binary through `MONGOMS_SYSTEM_BINARY` before running tests. MongoDB process execution must be allowed by your machine's security policy.

Backend checks cover login, validation, ownership, photos, full patrol lifecycle, early termination, public submissions and officer responses, safe/risk readings, concurrent alert deduplication, acknowledgements and resolution. Coverage thresholds are 80% for implemented controllers, patrol/tracking services, middleware and validation utilities. Frontend tests cover forms, API feedback, confirmation navigation, GPS fallback, photo size, protected routes and role dashboards. Frontend coverage reports the entire application and has no misleading global threshold.

`npm run build` creates `frontend/dist` and syntax-checks backend JavaScript. Start a configured API with `npm run start -w backend`. A frontend host must serve `frontend/dist`, route client navigation to `index.html`, and proxy `/api` and `/uploads`; alternatively set the API origin at build time and configure `FRONTEND_ORIGIN`. Local uploads need persistent disk. There is no hosting deployment included.

## Demonstration and design boundaries

- Incident offline mode is **simulation only**: reports are saved normally with `Pending` or `Synced`. No real offline synchronization is claimed.
- GPS collars and circular risk zones are simulated; Haversine distance is measured in metres. No real hardware, advanced GIS or paid map API is required.
- The location component is a labeled schematic, not a navigational map.
- Community response actions are recorded; there is no automatic dispatch or SMS gateway.
- Alerts/dashboard data refresh every 30 seconds. Repeated readings preserve existing alert acknowledgements.
- Use fictitious contact data. This university demonstration does not contact emergency services.

See [Design critique](docs/DESIGN_CRITIQUE.md), [Screenshot guide](docs/SCREENSHOT_GUIDE.md), and [Live demonstration walkthrough](docs/DEMO_WALKTHROUGH.md). The older `CODEX_DEVELOPMENT_GUIDE.md` describes the original foundation; the current implementation follows the attached assignment scope documented here.
