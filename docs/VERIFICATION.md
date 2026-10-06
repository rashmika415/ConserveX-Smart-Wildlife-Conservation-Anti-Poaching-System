# Verification record

Verified on 6 October 2026 with Node.js 22.17.0 on Windows.

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
