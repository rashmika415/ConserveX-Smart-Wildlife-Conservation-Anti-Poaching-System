# SWCAMS Development Guide for Codex Agent

## 1. Project Goal
Build the Assignment 02 implementation for the **Smart Wildlife Conservation and Anti-Poaching Monitoring System (SWCAMS)** while preserving the original Group 15 design as much as possible.

The system will be developed by **4 team members**, with each member owning one substantial business use case:

1. Incident Management
2. Collar Monitoring & High-Risk Zone Alerts
3. Patrol Management
4. Community Reporting

Do **not** redesign the project unnecessarily. Improve only where there is a clear logical, usability, UML, or implementation issue.

---

## 2. Assignment Rules to Follow

- Preserve the original use cases and design as much as possible.
- Any design change must have a clear justification.
- Do not replace a use case unless it is genuinely too simple to be substantial.
- IoT, sensors, collars, SMS gateways, and ML-related behavior may be **mocked or simulated with dummy data**.
- Do not remove an IoT/ML feature just because physical hardware or a model is unavailable.
- Login, logout, password management, role granting, and general user administration are **supporting features only** and must not be treated as a team member's main graded use case.
- Implementation must match the final revised use case scenarios, sequence diagrams, and wireframes.
- Prefer high-quality, maintainable implementation over unnecessary scope.
- Each business unit must have meaningful unit tests. Target **80%+ coverage**.

---

## 3. Development Scope

### Member 1 - Incident Management
Implement the ranger incident-reporting workflow.

Minimum features:
- Create incident during an active patrol
- Select incident type
- Capture/use GPS location
- Manual location fallback when GPS fails
- Optional photo
- Short description
- Required-field validation
- Save while offline
- Show sync state clearly
- Automatically/retry sync when connectivity returns
- View own reported incidents

Recommended states:
- `DRAFT`
- `SAVED_OFFLINE`
- `PENDING_SYNC`
- `SYNCED`

Important improvement:
Clearly distinguish **saved locally** from **successfully synchronized**.

---

### Member 2 - Collar Monitoring & High-Risk Zone Alerts
Implement the GPS collar monitoring workflow using simulated IoT data.

Minimum features:
- Register/use test collars
- Simulate collar location readings
- Validate collar ID/status
- Store collar location history
- Define high-risk zones
- Detect whether an animal enters a high-risk zone
- Create an alert
- Notify/show alert to Ranger/CLO
- Acknowledge alert
- Prevent unnecessary duplicate alerts for the same unresolved event
- Escalate or flag unacknowledged alerts where implemented in the final design

Provide a simple simulator, for example:
- `Simulate Safe Location`
- `Simulate High-Risk Zone Entry`
- `Simulate Invalid Collar`

No physical collar is required.

---

### Member 3 - Patrol Management
Implement the complete patrol lifecycle.

Minimum features:
- Create patrol route
- Add checkpoints
- Assign a ranger
- View assigned patrol
- Start patrol
- Track/log waypoints
- Record optional waypoint note/photo
- Store waypoint locally if offline
- End patrol
- Support early termination with reason
- Generate patrol summary
- Show sync state

Recommended improvement:
Before assignment, check whether the ranger already has a conflicting active/scheduled patrol.

---

### Member 4 - Community Reporting
Implement community elephant-sighting/conflict reporting.

Minimum features:
- Mobile/web reporting form
- Elephant sighting report
- Location entry/GPS when available
- Optional photo
- Short description
- Confirmation after submission
- Show report to Ranger/CLO dashboard
- Record response/action
- Duplicate-report handling where appropriate
- Simulated SMS input instead of a real telecom integration

Example simulated SMS:
`ELEPHANT <village/landmark>`

Important improvement:
Resolve the original ambiguity for mobile-app offline reporting:
- If online -> submit normally
- If offline -> save locally as pending
- When connectivity returns -> synchronize automatically

A real SMS gateway is not required.

---

## 4. Shared Supporting Features
These features should be implemented once and shared by the team. They are **not** a member's main use case.

- Basic authentication or predefined demo users
- Role identification: Ranger, Park Manager, Community Liaison Officer
- Database connection
- Common layout/navigation
- Common API client
- Common error handling
- Shared map/location utilities
- Shared file/image upload utility
- Shared notification/toast component
- Environment configuration

For development/demo purposes, seeded users are acceptable, for example:
- `R001 - Ranger`
- `M001 - Park Manager`
- `C001 - Community Liaison Officer`

Do not spend major development time building a full User Management module unless the final group design explicitly requires it.

---

## 5. Recommended Architecture
Use a modular architecture so each member can work independently.

```text
frontend/
  src/
    modules/
      incidents/
      collars/
      patrols/
      community/
    components/
    services/
    hooks/
    utils/

backend/
  src/
    routes/
    controllers/
    services/
    models/
    repositories/
    middleware/
    utils/
  tests/
```

Preferred request flow:

```text
Route -> Controller -> Service -> Repository/Model
```

Do not put all business logic directly inside route handlers or UI components.

---

## 6. Git / Branch Rules
Each member should work on a separate branch.

Suggested branches:

```text
main
  dev
  feature/incident-management
  feature/collar-monitoring
  feature/patrol-management
  feature/community-reporting
```

Rules:
- Never develop directly on `main`.
- Pull/rebase from `dev` before starting major work.
- Keep commits small and meaningful.
- Open a pull request into `dev` after the feature is stable.
- Resolve conflicts before merging.
- Merge into `main` only after integration testing.

Example commit messages:

```text
feat(incident): add offline incident creation
feat(collar): add geofence alert detection
fix(patrol): prevent conflicting ranger assignment
test(community): add duplicate report tests
```

---

## 7. API and Data Rules

- Use clear REST-style routes.
- Validate all incoming data.
- Return consistent error responses.
- Keep timestamps for important business events.
- Store actor/user IDs where required for traceability.
- Use enums/constants for statuses instead of random strings.
- Do not hard-code business logic in the frontend if it belongs in the backend.
- Keep mock IoT/SMS data clearly separated from core business logic so real integrations could replace the mocks later.

Example response shape:

```json
{
  "success": true,
  "message": "Incident saved",
  "data": {}
}
```

---

## 8. Testing Requirements
Each member must write meaningful unit tests for their own use case.

Target: **80%+ functional coverage**.

Tests should include:
- Positive cases
- Negative cases
- Validation failures
- Edge cases
- Error cases

Examples:

### Incident
- valid report
- missing incident type
- GPS unavailable
- no photo
- offline save
- sync success/failure

### Collar
- safe-zone reading
- high-risk-zone entry
- invalid collar
- malformed coordinates
- duplicate alert prevention
- acknowledgement

### Patrol
- route assignment
- assignment conflict
- start patrol
- waypoint creation
- offline waypoint
- early termination
- interrupted sync

### Community
- valid report
- no photo
- invalid SMS format
- offline mobile report
- sync on reconnect
- duplicate sighting

---

## 9. UI Rules
- UI must stay consistent with the final storyboard/wireframes.
- Keep screens simple and task-focused.
- Show validation near the relevant field.
- Always show clear success/error feedback.
- Show offline/sync status where relevant.
- Avoid unnecessary redesign after the report is finalized.

---

## 10. Definition of Done for Each Member
A feature is complete only when:

- Main flow works end to end
- Relevant alternate flows work
- Important exception/error flows work
- Backend validation exists
- UI matches revised design
- Database persistence works
- Mock/simulated integration works where applicable
- Unit tests are included
- No obvious console/server errors
- Code is clean and modular
- Feature is merged to `dev` through a reviewed pull request

---

## 11. Important Instruction to Codex
Before changing code:

1. Inspect the existing repository structure.
2. Do not rewrite unrelated modules.
3. Reuse existing components and conventions where possible.
4. Ask for clarification if the requested implementation would contradict the finalized use case/sequence diagram/wireframe.
5. Make the smallest change that correctly implements the requirement.
6. Do not add unrelated features from the larger SRS unless they are required by one of the four selected use cases.
7. Keep IoT/SMS behavior mockable and replaceable.
8. Preserve existing working functionality.
9. Add/update tests whenever business logic changes.
10. Summarize changed files and how to test the feature after completing a task.

---

## 12. First Repository Setup Tasks
Before team members begin feature development, prepare:

- `dev` branch
- frontend/backend project structure
- `.gitignore`
- `.env.example`
- database connection
- basic seeded/demo users
- shared error-response format
- base API route structure
- test framework configuration
- shared lint/format configuration if used
- README instructions for installation and running the project

After this foundation is stable, each member can begin their feature branch independently.
