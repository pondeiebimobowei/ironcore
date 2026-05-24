# IronCore Retain

Recurring revenue recovery infrastructure for membership businesses.

IronCore Retain helps gyms, wellness studios, and recurring-service SMBs detect overdue revenue, run recovery workflows, verify manual payments, and show recovered revenue.

This repository is intentionally scoped to the MVP foundation. It should not grow into gym management, scheduling, attendance tracking, POS, workout planning, or AI assistant software.

## Current State

The MVP recovery loop is implemented:

- custom JWT auth with refresh token rotation
- organization-scoped member management and CSV import
- membership lifecycle state engine with timeline events
- dashboard metrics for revenue at risk, overdue revenue, and recovered revenue
- transfer payment verification with approve/reject actions
- mock recovery workflows and message logs
- task queue with urgency grouping and task completion
- settings, organization profile editing, and billing placeholder screens
- GlitchTip-compatible error monitoring hooks
- lightweight PostHog event capture

The app is still intentionally scoped to the recovery MVP. It is not a gym management system.

## Requirements

- Node.js 20+
- npm 10+
- Git
- Docker Desktop or another Docker-compatible runtime

The local stack uses PostgreSQL, Prisma, NestJS, and Vite.

## Local Environment

Create a local environment file:

```bash
cp .env.example .env
```

Start the local PostgreSQL database:

```bash
docker compose -f docker/docker-compose.yml up -d db
```

The local API defaults to `http://localhost:4000`, and the Vite app defaults to `http://localhost:5173`.

Run the containerized web/API/database stack:

```bash
docker compose -f docker/docker-compose.yml up --build
```

The containerized web app is exposed on `http://localhost:8080` by default.

Generate Prisma Client and seed demo data:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Optional monitoring and analytics environment variables:

```env
GLITCHTIP_DSN=""
VITE_GLITCHTIP_DSN=""
VITE_POSTHOG_KEY=""
VITE_POSTHOG_HOST="https://app.posthog.com"
```

## Common Commands

Install dependencies:

```bash
npm install
```

Start all workspace dev servers:

```bash
npm run dev
```

Build all workspaces:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Run tests:

```bash
npm run test
```

Run TypeScript checks:

```bash
npm run typecheck
```

`npm run check-types` is kept as a compatibility alias for older starter scripts.

## Production Deployment With Coolify

Use Coolify's Docker Compose build pack with `docker/docker-compose.yml`.

Recommended Coolify setup:

1. Create a Docker Compose application from this repository.
2. Set the compose file path to `docker/docker-compose.yml`.
3. Configure the web domain to point at the `web` service on port `80`.
4. Configure the API domain to point at the `api` service on port `4000`.
5. Mark the public Vite variables as build-time variables in Coolify so the web image is built with production URLs.
6. Run `npm run db:migrate:deploy --workspace=apps/api` against the production database before first traffic, or run it from the API container during a controlled release.

Required production variables:

```env
POSTGRES_USER="..."
POSTGRES_PASSWORD="..."
POSTGRES_DB="ironcore_retain"
DATABASE_URL="postgresql://USER:PASSWORD@db:5432/ironcore_retain"
API_PORT=4000
WEB_PORT=8080
WEB_ORIGIN="https://app.example.com"
VITE_API_URL="https://api.example.com"
VITE_SUPPORT_EMAIL="support@example.com"
JWT_ACCESS_SECRET="use-a-long-random-secret"
JWT_REFRESH_SECRET="use-a-long-random-secret"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
COOKIE_SECRET="use-a-long-random-secret"
BCRYPT_ROUNDS=12
WHATSAPP_PROVIDER="mock"
```

Optional production variables:

```env
GLITCHTIP_DSN=""
VITE_GLITCHTIP_DSN=""
VITE_POSTHOG_KEY=""
VITE_POSTHOG_HOST="https://app.posthog.com"
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="ironcore-payment-proofs"
R2_BACKUP_BUCKET_NAME="ironcore-db-backups"
```

Health checks:

- Web: `GET /health`
- API: `GET /api/health`

Deployment smoke test:

```bash
curl -fsS https://app.example.com/health
curl -fsS https://api.example.com/api/health
```

Then sign in, open `/workflows`, run the protected workflow debug endpoint from an owner session, and confirm `MessageLog`, `JobRun`, and member timeline entries update as expected.

## Workspace Layout

```txt
apps/
  api/      NestJS REST API
  web/      Vite + React SPA
packages/
  config-eslint/
  config-typescript/
  jest-presets/
  logger/
  ui/
doc/        Product and architecture documentation
```

## Architecture Direction

The MVP follows the accepted decisions in `doc/architecture-decision-records.md`:

- modular monolith
- Vite + React SPA
- NestJS REST API
- PostgreSQL + Prisma
- custom JWT authentication with refresh token rotation
- organization-scoped multi-tenant data
- Cloudflare R2 for payment proof storage and database backups
- mock WhatsApp provider before real WhatsApp integration

## MVP Flows

1. Sign up or log in.
2. Import members or create a member manually.
3. Run the member state job from the protected admin debug endpoint when needed.
4. Review dashboard revenue risk and open tasks.
5. Create or review pending payments, then approve or reject payment proof.
6. Use the recovery queue to complete operational follow-up tasks.
7. Review member timelines to confirm audit events.

Admin debug endpoints:

```txt
POST /api/admin/jobs/update-member-states
POST /api/admin/workflows/run
```

Both require an authenticated owner account.

## Known MVP Limitations

- WhatsApp is mocked; no real WhatsApp Business API messages are sent.
- Billing is a placeholder and does not connect to a payment processor.
- Workflow definitions are persisted for list/detail screens and the fixed create wizard; arbitrary branching, drag-and-drop automation, and automatic execution generation from custom definitions remain out of scope.
- Organization profile persistence covers core business, contact, address, business-hour, logo URL, and image URL fields.
- Image and logo upload mechanics are placeholders; URLs can be stored, but file storage is not enabled yet.
- File proof upload/storage is not enabled yet.
- Deployment items such as Coolify, SSL, production backups, and smoke testing must be completed in the deployment environment.

## Pilot Feedback

During pilot onboarding, capture:

- imported member count and data issues
- overdue revenue detected
- recovered revenue after payment verification
- recovery tasks completed by staff
- confusing screens or missing next actions

Use this feedback to refine the recovery loop before adding non-MVP gym management features.

See [doc/launch-readiness.md](doc/launch-readiness.md) for the Phase 10 QA, deployment, support, and pilot-readiness checklist.

## Execution Rules

- Build one task at a time.
- Prioritize architecture foundation before feature work.
- Keep business logic out of React components and controllers.
- Scope all core data by organization.
- Use timeline events for important state transitions.
- Do not build features outside the documented MVP scope.

See `AGENTS.md` for the tracked task alignment protocol and AI-assisted development rules. The fuller product documentation lives in `doc/`.
