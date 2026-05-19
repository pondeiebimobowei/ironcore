# IronCore Retain

Recurring revenue recovery infrastructure for membership businesses.

IronCore Retain helps gyms, wellness studios, and recurring-service SMBs detect overdue revenue, run recovery workflows, verify manual payments, and show recovered revenue.

This repository is intentionally scoped to the MVP foundation. It should not grow into gym management, scheduling, attendance tracking, POS, workout planning, or AI assistant software.

## Current State

The codebase currently contains the project scaffold:

- `apps/web`: Vite + React SPA
- `apps/api`: NestJS REST API
- `packages/*`: shared workspace tooling and starter packages
- `doc`: product, architecture, schema, and implementation documentation

The product features are not implemented yet. Follow the roadmap in `doc/implementation-plan.md` and execute one task at a time.

## Requirements

- Node.js 20+
- npm 10+
- Git
- Docker Desktop or another Docker-compatible runtime

Prisma will be added in a later foundation task before domain feature work begins.

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

## Execution Rules

- Build one task at a time.
- Prioritize architecture foundation before feature work.
- Keep business logic out of React components and controllers.
- Scope all core data by organization.
- Use timeline events for important state transitions.
- Do not build features outside the documented MVP scope.

See `doc/agents.md` for AI-assisted development rules.
