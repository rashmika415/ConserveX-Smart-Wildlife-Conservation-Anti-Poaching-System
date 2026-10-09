# Verification record

## Frontend coverage update — 9 October 2026

`npm.cmd run test -w frontend -- --coverage` passes **153 tests across 15 test files**.

| Metric     | Whole-frontend coverage |
| ---------- | ----------------------- |
| Statements | 94.68%                  |
| Branches   | 87.40%                  |
| Functions  | 91.42%                  |
| Lines      | 95.65%                  |

The frontend coverage configuration now requires at least **80% for each metric globally**. The existing coverage scope is unchanged: all JavaScript/JSX application files are included except the bootstrap entry point (`src/main.jsx`) and test files.

New tests exercise session restoration and expiry, offline incident persistence and retries, cached patrol recovery, incident review, patrol assignment, waypoint recording, completion and early termination, role navigation, dashboard calculations, API authentication, geocoding failures, and location controls. Network responses and the third-party map engine are mocked at their boundaries; these results describe unit/component tests, not a new browser or backend verification run.

The dated results below are historical records and do not represent the current frontend totals.

Verified on 6 October 2026 with Node.js 22.17.0 on Windows.

## Member 2 unit coverage update — 7 October 2026

- The frontend suite passes 25 tests. `frontend/src/modules/collars/` has **94.73% statements, 87.03% branches, 88.88% functions, and 96.59% lines**. Tests cover safe and risk simulations, invalid collars, reading history, zone creation feedback, alert filtering, acknowledgement, resolution, response errors, and resolved alert history.
- The most recent backend coverage run passes 23 tests. `backend/src/services/tracking.js` has **90.9% statements, 80% branches, 100% functions, and 93.33% lines**; backend tracking controllers have 100% across all four measures.
- Whole-frontend coverage is **45.83% statements, 51.36% branches, 37.07% functions, and 47.59% lines**. The 80% target is met for the Member 2 module, not the entire frontend application.
- The browser workflow suite has not been rerun since the zone exit and re-entry change.

## Automated evidence

- **Backend:** 19 Jest/Supertest tests passed against MongoDB 7.0.24 in an isolated temporary database. No application database was contacted.
- **Backend coverage:** 97.54% statements, 89.93% branches, 98.24% functions and 99.12% lines across controllers, implemented patrol/tracking services, middleware and utilities. All configured 80% thresholds passed.
- **Frontend:** 13 Vitest/React Testing Library tests passed, covering login success/failure, incident validation and simulated sync, public reporting, GPS fallback, oversized photos, route protection and role dashboards.
- **Frontend unit coverage:** 27.67% statements and 28.37% lines across the whole UI. The unit suite is focused on the requested forms and shared behavior; browser workflow coverage is separate and is not included in these percentages. An 80% whole-frontend coverage claim is not made.
- **Browser:** two Playwright scenarios passed in Chromium. The first walks through all four persistent workflows; the second verifies public pages and staff navigation/forms at 390px width. No JavaScript page errors were observed during the full business-flow scenario.
- **Build:** Vite production build and backend JavaScript syntax checks passed.
- **Formatting:** Prettier and `git diff --check` passed. The mobile sidebar animation fix was subsequently rechecked in Chromium.
- **Production dependencies:** `npm audit --omit=dev` reported zero known vulnerabilities at verification time.

## Business flows exercised in Chromium

1. Manager assigns a patrol; ranger starts it, records a waypoint, files a linked incident, ends patrol and views its summary; manager reviews the incident.
2. Manager submits safe and critical-zone collar readings; liaison acknowledges the generated alert with recorded identity/time.
3. A public user reports elephants; liaison finds the saved report, records a response and changes its status.
4. At mobile width, public home/report/login and a ranger incident form fit without page-level horizontal overflow. The hamburger navigation opens and closes.

Backend API tests additionally verify early termination, authorization/ownership failures, duplicate active patrol prevention, invalid inputs, local image uploads, repeated/concurrent alert deduplication, repeated acknowledgement rejection and re-entry after resolution.

## Remaining limitations

- The supplied Atlas connection was not contacted or seeded. Running against that database still requires valid credentials and Atlas network access.
- First-time test setup needs a MongoDB binary. The full Windows download was slow; this workspace uses an extracted local executable at ignored `.local/mongod.exe`. Other machines can use normal automatic downloads or set `MONGOMS_SYSTEM_BINARY`.
- The full development dependency audit reports a moderate `sprintf-js` advisory propagated through Jest’s coverage tooling (19 affected dependency-tree entries). The registry has no patched release; npm’s suggested Jest downgrade is incompatible with the selected runner and was not applied. Production dependencies are unaffected.
- This is a university demo, with the offline, collar, schematic-map and response-action boundaries documented in `DESIGN_CRITIQUE.md`.

The full browser suite generates ignored `test-results/manager-dashboard.png` and `test-results/mobile-incident-form.png`. Filtered runs regenerate only their selected test artifacts. Re-run the full browser suite to regenerate both screenshots.
