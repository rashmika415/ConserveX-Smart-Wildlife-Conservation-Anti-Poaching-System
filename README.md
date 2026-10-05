# ConserveX

Smart Wildlife Conservation and Anti-Poaching Monitoring System (SWCAMS).

## Requirements

- Node.js 22.12+ (Node.js 24 LTS recommended) and npm
- Git
- MongoDB locally or MongoDB Atlas when you are ready to enable persistence

## First run

Run these commands from the repository root:

```powershell
npm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm run dev
```

Only copy the examples if the corresponding `.env` does not already exist.
Open http://localhost:5173. The backend runs at http://localhost:4000.
The frontend proxies `/api` requests to the backend during development.

## Add MongoDB later

Edit **backend/.env** and set:

```dotenv
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER/conservex
```

Use the actual connection string provided by your database, including its database name and required options. For a local server, use `mongodb://127.0.0.1:27017/conservex`.
Keep credentials out of Git and frontend environment files. For Atlas, allow your development machine in Network Access and configure a database user. URL-encode special characters in credentials.
Restart the backend after changing its environment, then run:

```powershell
npm run seed
```

Seeding upserts R001 (Ranger), M001 (Park Manager), and C001 (Community Liaison Officer), so it can be repeated safely.

With an empty URI, the API and frontend run with predefined demo users. Database-backed functionality remains unavailable; no records are silently saved in memory. A configured URI that cannot connect causes startup to fail with a configuration message.

## Foundation API

| Route                       | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| GET /api/health             | API liveness and database status             |
| GET /api/ready              | 200 when MongoDB is connected; otherwise 503 |
| GET /api/demo-users         | Predefined development users                 |
| GET /api/demo-users/:userId | One predefined user                          |

Response format: `{ "success": true, "message": "...", "data": {} }`.
Demo role selection is not authentication or server-side authorization. Add authorization before protected business operations are implemented.

## Checks

```powershell
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run format:check
```

Coverage thresholds are 80% for shared services, controllers, middleware and utilities currently implemented. Expand coverage to each business module as it is developed. Database connectivity and seed persistence need a real database and are not exercised by the foundation tests.

Production build commands are `npm run build` and `npm run start -w backend`. Serve `frontend/dist` with your hosting provider and route `/api` to the backend, or set `VITE_API_BASE_URL` to the backend URL before building. Set `FRONTEND_ORIGIN` to the frontend origin.

## Team workflow

Develop on `dev` and feature branches, never directly on `main`. Create feature branches from the stable `dev` foundation:

```powershell
git switch dev
git switch -c feature/incident-management
```

Other branches: `feature/collar-monitoring`, `feature/patrol-management`, `feature/community-reporting`. Review feature pull requests into `dev`; merge into `main` after integration testing.

## Structure and scope

- `frontend/src/modules/`: incidents, collars, patrols, community
- `frontend/src/components/`, `services/`, `hooks/`, `utils/`: shared frontend foundation
- `backend/src/routes/`, `controllers/`, `services/`, `repositories/`, `models/`, `middleware/`, `utils/`: modular API
- `backend/tests/`: foundation API tests

The starter dashboard is a development placeholder pending the finalized wireframes. Business workflows, offline queues and automatic synchronization, maps, uploads, notifications, IoT/SMS simulators and authentication are subsequent feature work. IndexedDB (`idb`) and Leaflet dependencies are ready for those modules.
See [CODEX_DEVELOPMENT_GUIDE.md](CODEX_DEVELOPMENT_GUIDE.md) for assignment scope and rules.
