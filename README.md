# ConserveX

Wildlife Conservation and Anti-Poaching Monitoring System

ConserveX is a responsive web application for coordinating park managers, rangers, community liaison officers, and public wildlife reports. This university project implements four connected workflows using a React frontend, an Express REST API, and MongoDB.

## Features and user roles

| Module                     | Main capabilities                                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Incident management        | Rangers report incidents with GPS or manual coordinates, descriptions, optional photographs, and patrol links. Reports can be queued offline and synchronized. Managers review incidents and update their status.                                      |
| Animal tracking and alerts | Managers simulate GPS collar readings, view movement history, and create circular High/Critical risk zones. Zone entry generates alerts; rangers and liaison officers acknowledge them, and managers resolve them.                                     |
| Patrol management          | Managers assign routes and checkpoints. Assigned rangers start patrols, record waypoints and photographs, and complete or end patrols early with a reason. Offline waypoint storage supports later synchronization.                                    |
| Community reporting        | The public submits elephant sightings or crop-raiding reports without login. Staff view reports; managers and liaison officers review details, record response actions, and update statuses. Includes an SMS submission simulator and PDF/CSV exports. |

Staff have role-specific dashboards, profiles, and notifications for collar alerts and community sightings. Rangers can view community report lists with contact details omitted, but cannot open case details or change their status. Incident and patrol access for rangers is restricted to their own records.

## Technology and architecture

- **Frontend:** React 19, Vite 7, React Router, Axios, Lucide icons, and responsive CSS.
- **Maps and reports:** Leaflet with OpenStreetMap tiles, Geoapify reverse geocoding, jsPDF, and CSV export.
- **Backend:** Node.js, Express 5, Mongoose, JWT authentication, bcryptjs password hashing, Multer uploads, Helmet, and request rate limiting.
- **Storage:** MongoDB for server records, local disk for uploaded photos, and browser storage for offline data.
- **Testing:** Jest/Supertest, Vitest/React Testing Library, and Playwright.

```text
React frontend -> Express routes -> Authentication and role checks
                -> Controllers/services -> MongoDB
```

The API validates requests and enforces ownership. Database indexes prevent multiple active patrols for one ranger and duplicate unresolved alerts for the same animal and zone. JWT sessions expire after eight hours; the frontend keeps session credentials in session storage.

## Prerequisites

- Node.js **22.12 or later** and npm.
- A running local MongoDB server or a MongoDB Atlas database.
- A modern browser. GPS capture requires location permission and localhost or HTTPS; manual coordinate entry is available.
- Internet access for dependency installation, online maps/geocoding, and initial test binary downloads.

## Installation and configuration

Run the following from the repository root in PowerShell. On macOS/Linux, use `npm` instead of `npm.cmd` and copy the two environment example files using your shell or file manager.

```powershell
npm.cmd install
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Edit `backend/.env` and replace the secret placeholder with the generated value:

```dotenv
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/wildlife_conservation
JWT_SECRET=PASTE_YOUR_GENERATED_RANDOM_SECRET_HERE
ALERT_ESCALATION_MINUTES=15
```

`JWT_SECRET` must contain at least 32 characters. Start your local MongoDB service before continuing. For Atlas, use your database connection string, including a database name, and configure its database user and network access. Keep database credentials and JWT secrets in `backend/.env`; environment files are ignored by Git.

Configure `frontend/.env`:

```dotenv
VITE_API_URL=/api
VITE_GEOAPIFY_API_KEY=YOUR_GEOAPIFY_API_KEY
```

Use your own Geoapify key for place-name lookup. Coordinate entry remains available if geocoding fails. Frontend `VITE_` variables are visible in the browser and must not contain server secrets.

During development, Vite proxies `/api` and `/uploads` to `http://localhost:4000`. If you change the API port, update both proxy targets in [frontend/vite.config.js](frontend/vite.config.js).

## Seed and run

```powershell
npm.cmd run seed
npm.cmd run dev
```

| Service            | Address                          |
| ------------------ | -------------------------------- |
| Application        | http://localhost:5173            |
| API health         | http://localhost:4000/api/health |
| Database readiness | http://localhost:4000/api/ready  |

The seed populates demo staff, animals, collars, risk zones, patrols, incidents, a community report, and an alert. It fills missing examples without deleting existing reports or resetting existing passwords. Use a dedicated project database for the demonstration.

To run the services separately, use `npm.cmd run dev -w backend` and `npm.cmd run dev -w frontend` in separate terminals. Stop running services with **Ctrl+C**.

### Demo accounts

| Role                      | Email               | Password    |
| ------------------------- | ------------------- | ----------- |
| Park Manager              | manager@wildlife.lk | Manager123! |
| Ranger                    | ranger@wildlife.lk  | Ranger123!  |
| Community Liaison Officer | officer@wildlife.lk | Officer123! |

These accounts are created by the seed command and are intended for local assessment. Public reporting does not require an account.

## Demonstrating the application

1. **Patrols:** Sign in as the manager and assign a patrol. Sign in as the assigned ranger, start it, record a waypoint, and complete it or end it early with a reason.
2. **Incidents:** As the ranger, submit an incident with coordinates and an optional photograph. Check its history, then sign in as the manager to review it and update its status.
3. **Tracking:** As the manager, open Animal Tracking and simulate a safe reading followed by a risk-zone reading. Acknowledge the alert as a ranger or liaison officer, then resolve it as the manager.
4. **Community reports:** Submit a sighting through the public form or SMS simulator. Sign in as a liaison officer to review the case, record a response, update its status, and export a report.

Repeated readings inside a zone update its unresolved alert. After resolution, a new alert requires a reading outside that zone followed by re-entry. Unacknowledged alerts are flagged as escalated after 15 minutes by default, with background checks every 30 seconds. Change `ALERT_ESCALATION_MINUTES` and restart the API to use another positive threshold. Staff notifications refresh every 30 seconds; opening a notification does not acknowledge an alert.

An optional tracking demonstration runs with a disposable database:

```powershell
npm.cmd run demo:collars
```

It checks tracking scenarios, uses a six-second escalation threshold, and serves the demo at **http://127.0.0.1:5175** with the API on port **4200**. It does not use the configured project database. Press **Ctrl+C** to stop it and discard the data. Use `npm.cmd run demo:collars -- --check` for an automated run that exits after verification.

## Tests and production build

Run these commands from the repository root:

Each member command runs the relevant frontend tests and backend API tests separately from the other modules:

| Member | Feature                        | Command                    |
| ------ | ------------------------------ | -------------------------- |
| 1      | Incident management            | `npm.cmd run test:member1` |
| 2      | GPS collar tracking and alerts | `npm.cmd run test:member2` |
| 3      | Patrol management              | `npm.cmd run test:member3` |
| 4      | Community reporting            | `npm.cmd run test:member4` |

Use `npm.cmd test` for the complete frontend/backend suite, including shared authentication and utility tests. Member runs do not calculate whole-application coverage. Use the full coverage command below for that; browser tests are a separate command.

| Command                     | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `npm.cmd test`              | Run backend and frontend tests.                            |
| `npm.cmd run test:coverage` | Generate backend and frontend coverage reports.            |
| `npm.cmd run build`         | Build the frontend and syntax-check backend JavaScript.    |
| `npm.cmd run format:check`  | Check repository formatting with Prettier.                 |
| `npm.cmd run test:e2e`      | Run Playwright browser workflows and mobile layout checks. |

Before the first browser test run, install Chromium:

```powershell
npm.cmd exec -- playwright install chromium
npm.cmd run test:e2e
```

Backend tests and browser tests use disposable MongoDB instances rather than the database configured in `backend/.env`. The first run may download a MongoDB binary. If necessary, set `MONGOMS_SYSTEM_BINARY` to an installed MongoDB executable. Browser tests need ports **4100** and **5174** available; `PLAYWRIGHT_EXECUTABLE_PATH` can select an existing Chromium executable. Test artifacts are written to ignored coverage, Playwright report, and `test-results/` directories.

The production frontend is generated in `frontend/dist`. Start the configured backend with `npm.cmd run start -w backend`. Hosting requires a frontend server that falls back to `index.html` for client routes, proxies `/api` and `/uploads`, and preserves the backend upload directory. For separate frontend/API hosts, set the full API URL in `VITE_API_URL` before building and configure `FRONTEND_ORIGIN` on the backend.

## API overview

Routes are prefixed with `/api`. Protected requests require `Authorization: Bearer <token>`. The complete route definitions and access policies are in [backend/src/routes/index.js](backend/src/routes/index.js).

| Route group                                               | Access and purpose                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/health`, `/ready`, `/auth/login`                        | Public health/readiness checks and staff login.                                                                                 |
| `/auth/me`, `/users`                                      | Current staff profile; staff listing is manager-only.                                                                           |
| `/incidents`                                              | Rangers create incidents; managers review and update status. Rangers read only their own incidents.                             |
| `/patrols`                                                | Managers assign patrols; assigned rangers start them, add waypoints, and end them.                                              |
| `/animals`, `/collars`, `/risk-zones`, `/collar-readings` | Manager-only animal tracking, zone creation, simulated readings, and history.                                                   |
| `/alerts`                                                 | All staff read alerts; rangers/liaison officers acknowledge; managers resolve.                                                  |
| `/community-reports`, `/community-reports/sms`            | Public, rate-limited submissions. All staff can list reports; managers/liaison officers access case details and record updates. |
| `/community-reports/notifications`                        | Community sighting notifications for authenticated staff.                                                                       |

Responses use `{ "success": true, "message": "...", "data": ... }`; errors use `success: false`. Incident, waypoint, and community report creation accept JSON without a photo or `multipart/form-data` with a `photo` field. Supported photos are PNG, JPEG, or WebP up to **5 MB**, stored in `backend/uploads` and served through `/uploads`.

## Project structure

```text
backend/
  src/
    controllers/    Request handling for authentication and the four modules
    middleware/     Authentication, roles, uploads, and error handling
    models/         MongoDB schemas and indexes
    routes/         API endpoints and access policies
    services/       Patrols, tracking, alert escalation, and demo seed data
    scripts/        Database seed entry point
    utils/          Validation, geography, and response helpers
  tests/            Backend integration and unit tests
frontend/
  src/
    components/     Shared forms, maps, notifications, and feedback
    context/        Authentication and session state
    hooks/          Data loading and offline synchronization
    layouts/        Public and staff navigation
    modules/        Incidents, patrols, tracking, and community reports
    pages/          Login, public reporting, dashboards, and profile
    services/       API client, offline storage, geocoding, and exports
    test/           Frontend tests
scripts/            Isolated demo and browser-test servers
e2e/                Playwright tests
docs/               Supporting design, demonstration, and verification notes
```

## Scope and limitations

- GPS collar readings are simulated; there is no physical collar integration. Risk detection uses circular zones and Haversine distance in metres.
- Ranger incident and waypoint queues use IndexedDB and synchronize with an authenticated session when connectivity returns. Open the application and required patrol while online first; it has no service worker for a guaranteed offline start. Clearing browser data removes unsynchronized records.
- Public reports saved offline use local storage. Automatic replay and preservation of photo files for those reports are not implemented; submit them again when connected.
- Maps and place-name lookup depend on external services and internet access. Some views use schematic coordinate displays.
- The SMS form simulates submissions through the API. No real SMS/email gateway, emergency-service connection, or automatic field dispatch is included; response actions are recorded in the application.
- User administration, password recovery, and a hosted deployment are outside the implemented scope.

## Troubleshooting

| Problem                       | What to check                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| API fails to start            | Confirm MongoDB is reachable, `MONGODB_URI` is set, and `JWT_SECRET` has at least 32 characters.                               |
| Demo login fails              | Run the seed command against the same database used by the API. Existing passwords are not reset by seeding.                   |
| Frontend cannot reach the API | Check that both services are running and the Vite proxy ports match the backend.                                               |
| GPS or map lookup fails       | Allow browser location access, use localhost/HTTPS, or enter coordinates manually. Check internet access and the Geoapify key. |
| Test database cannot start    | Allow the initial MongoDB binary download or set `MONGOMS_SYSTEM_BINARY` to a working local executable.                        |
| Port already in use           | Stop the conflicting process or change the configured port and corresponding proxy/origin settings.                            |
