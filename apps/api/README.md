# IronCore Retain API

NestJS REST API for the IronCore Retain MVP recovery loop.

The API owns authentication, organization scoping, member and membership state, payment verification, workflow execution, task creation, timelines, and dashboard metrics.

## Local Development

From the repository root:

```bash
npm install
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d db
npm run db:migrate
npm run db:seed
npm run dev --workspace=apps/api
```

The API defaults to `http://localhost:4000`.

## Useful Commands

```bash
npm run build --workspace=apps/api
npm run typecheck --workspace=apps/api
npm run lint --workspace=apps/api
npm run test --workspace=apps/api
npm run test:e2e --workspace=apps/api
npm run db:validate --workspace=apps/api
npm run db:generate --workspace=apps/api
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api
```

## Core Modules

- `auth`: JWT login, signup, refresh rotation, logout
- `organizations`: organization setup and profile updates
- `members`: member CRUD and CSV import
- `memberships`: lifecycle state and renewals
- `payments`: manual transfer payment review
- `workflows`: persisted workflow definitions and mock recovery execution
- `tasks`: operational recovery queue
- `timeline`: audit events for important state changes
- `dashboard`: MVP revenue recovery metrics
- `jobs`: scheduled and admin-triggered state updates

## Important Endpoints

```txt
GET  /api/health
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/organization/setup
GET  /api/organization/current
GET  /api/dashboard/summary
GET  /api/members
POST /api/members/import/dry-run
POST /api/members/import/confirm
GET  /api/payments
POST /api/payments
POST /api/payments/:id/verify
POST /api/payments/:id/reject
GET  /api/workflows
POST /api/workflows
PATCH /api/workflows/:id
GET  /api/tasks
POST /api/tasks
PATCH /api/tasks/:id
POST /api/admin/jobs/update-member-states
POST /api/admin/workflows/run
```

Admin debug endpoints require an authenticated owner account.

## Data Rules

- Every tenant record is scoped by `organizationId`.
- Client-provided organization IDs are not trusted.
- Critical state transitions create `TimelineEvent` rows.
- Payments start as `PENDING_VERIFICATION` and only affect recovered revenue after approval.
- Workflow and member-state jobs must avoid duplicate work through idempotent state checks and job-run tracking.
