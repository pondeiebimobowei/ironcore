# IronCore Retain — Codex MVP Implementation Plan

## Purpose

This document is a step-by-step implementation plan for building the IronCore Retain MVP from zero to a launchable product.

It is optimized for:
- solo founder execution
- Codex-assisted development
- Cursor / Claude Code workflows
- rapid MVP shipping
- clean architecture
- realistic startup constraints

IronCore Retain is a recurring revenue recovery platform for membership businesses, starting with gyms and fitness studios.

The product exists to help businesses:
- detect revenue risk
- trigger recovery workflows
- verify payments
- prove recovered revenue

If a feature does not directly support those outcomes, it should not be built in the MVP.

---

## Non-Negotiable Product Rule

Do not build features that turn this into generic gym management software.

### Build Now

- member import
- member lifecycle states
- overdue revenue tracking
- recovery workflows
- payment verification
- revenue dashboard
- task queue
- timeline events
- mock WhatsApp integration

### Do Not Build Now

- class scheduling
- attendance tracking
- workout plans
- trainer management
- nutrition
- POS
- inventory
- mobile app
- AI assistant
- complex workflow builder
- advanced analytics
- embedded finance
- real billing automation

---

# 1. Project Setup

## Goal

Create a clean, maintainable Vite + React + TypeScript + Prisma + PostgreSQL foundation.

## Recommended Stack

### Frontend

- Vite + React (SPA)
- TypeScript
- React Router
- Axios API client
- Zod
- Plain CSS modules/global styles for the current MVP UI

### Backend

- NestJS (REST API, separate process)
- Prisma ORM
- PostgreSQL
- Zod validation
- Modular monolith architecture

### Infrastructure

- Coolify-managed VPS for all deployments
- Docker + Docker Compose for container orchestration
- PostgreSQL container (managed via Coolify)
- Cloudflare R2 for payment proof storage and database backup uploads
- Nightly SQL database backups to Cloudflare R2
- GlitchTip for error monitoring
- PostHog for product analytics

### Auth

Custom JWT-based authentication:

- Access tokens (short-lived, 15 min)
- Refresh tokens (long-lived, 7 days, stored httpOnly cookie)
- Secure refresh token rotation on every use
- Token revocation list in Redis or DB
- No external auth providers (no Clerk, no NextAuth, no Auth0)

### Messaging

- Mock WhatsApp provider first
- WhatsApp Business API abstraction later

### Package Manager

Use `npm` with npm workspaces.

### Monorepo Orchestration

Use `Turborepo` for:
- parallel dev server startup
- build caching
- dependency-ordered builds
- shared lint/test pipelines

---

## Repository Structure

```txt
ironcore-retain/
  apps/
    web/                         # Vite + React SPA
      src/
        pages/
          auth/
            login/
            signup/
            forgot-password/     # Static contact support notice only (no reset flow in MVP)
          dashboard/
          members/
          recovery/
          payments/
          workflows/
          settings/
        components/
          ui/
          shared/
          dashboard/
          members/
          payments/
          workflows/
          tasks/
        features/
          auth/
          organizations/
          members/
          memberships/
          payments/
          workflows/
          tasks/
          timeline/
          dashboard/
          messaging/
        lib/
          api/
          auth/
          validations/
          utils/
          constants/
          posthog/
        hooks/
        router/
      index.html
      vite.config.ts
    api/                         # NestJS backend
      src/
        modules/
          auth/
          organizations/
          members/
          memberships/
          payments/
          workflows/
          tasks/
          timeline/
          dashboard/
          messaging/
        common/
          guards/
          decorators/
          filters/
          interceptors/
          pipes/
        prisma/
          schema.prisma
          seed.ts
  docker/
    docker-compose.yml
    Dockerfile.web
    Dockerfile.api
  doc/
  .env.example
  README.md
```

---

## Initial Setup Commands

```bash
# Create monorepo root
mkdir ironcore-retain && cd ironcore-retain
npm init -y

# Install Turborepo
npm install turbo --save-dev

# Bootstrap Vite + React frontend
npm create vite@latest apps/web -- --template react-ts

# Bootstrap NestJS backend
npx @nestjs/cli new apps/api

# Frontend dependencies
cd apps/web
npm install react-router-dom axios zod

# Backend dependencies
cd ../api
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/config class-validator class-transformer
npm install prisma @prisma/client bcryptjs cookie-parser
npm install -D @types/passport-jwt @types/bcryptjs @types/cookie-parser
npx prisma init
```

---

## Environment Variables

Create `.env.example`.

```env
# --- Database ---
DATABASE_URL="postgresql://user:password@localhost:5432/ironcore_retain"

# --- App URLs ---
VITE_API_URL="http://localhost:4000"
API_PORT=4000

# --- JWT Auth ---
JWT_ACCESS_SECRET="change-me-access-secret"
JWT_REFRESH_SECRET="change-me-refresh-secret"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# --- Security ---
COOKIE_SECRET="change-me-cookie-secret"
BCRYPT_ROUNDS=12

# --- Monitoring ---
GLITCHTIP_DSN=""
VITE_GLITCHTIP_DSN=""
VITE_POSTHOG_KEY=""
VITE_POSTHOG_HOST="https://app.posthog.com"

# --- Messaging ---
WHATSAPP_PROVIDER="mock"
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
```

---

## TypeScript Configuration

Requirements:

- strict mode enabled
- no implicit `any`
- path aliases configured
- shared types centralized

Recommended aliases:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/features/*": ["features/*"],
      "@/lib/*": ["lib/*"]
    }
  }
}
```

---

## Linting and Formatting

Use:

- ESLint
- Prettier
- TypeScript strict mode

Create:

```txt
.prettierrc
.eslintrc.json
```

Rules:

- no unused variables
- no `any` unless explicitly justified
- no business logic inside UI components
- no direct database calls from components

---

## Git Workflow

Use simple startup Git.

```txt
main = production
dev = active development
feature/* = short-lived work branches
```

Commit format:

```txt
feat:
fix:
refactor:
docs:
test:
chore:
```

---

## Project Setup Acceptance Criteria

- app runs locally
- TypeScript strict mode works
- Prisma connects to PostgreSQL
- `.env.example` exists
- README includes local setup
- lint and typecheck pass

---

# 2. Architecture Foundation

## Goal

Establish a modular architecture before implementing product features.

Codex must not scatter logic randomly across the codebase.

---

## Domain Modules

Use these modules:

```txt
organizations
users
members
memberships
plans
payments
workflows
tasks
timeline
dashboard
messaging
analytics
```

---

## Folder Pattern Per Feature

Each feature module should follow this shape when needed:

```txt
features/members/
  actions.ts
  api.ts
  constants.ts
  schemas.ts
  service.ts
  types.ts
  utils.ts
```

Do not create files before they are useful.

---

## Shared Validation Pattern

Use Zod schemas.

```txt
lib/validations/member.ts
lib/validations/payment.ts
lib/validations/workflow.ts
lib/validations/import.ts
```

Example:

```ts
import { z } from "zod";

export const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  phoneNumber: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  planId: z.string().optional(),
  expiryDate: z.coerce.date().optional()
});
```

---

## Error Handling Pattern

Create:

```txt
lib/errors/app-error.ts
lib/errors/handle-api-error.ts
```

Example:

```ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400
  ) {
    super(message);
  }
}
```

Standard API error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload"
  }
}
```

---

## API Conventions

Use REST first.

```txt
GET    /api/members
POST   /api/members
POST   /api/members/import
GET    /api/members/:id
PATCH  /api/members/:id
DELETE /api/members/:id

GET    /api/dashboard/summary

GET    /api/tasks
PATCH  /api/tasks/:id

GET    /api/payments
POST   /api/payments
POST   /api/payments/:id/verify
POST   /api/payments/:id/reject

GET    /api/workflows
PATCH  /api/workflows/:id
POST   /api/admin/workflows/run  # (Admin debug route; main trigger is internal scheduler)
```

---

## Auth Architecture

MVP rule:

- every user can exist before organization setup
- tenant-scoped product routes require an active organization membership
- every query must be scoped by organization
- never trust client-provided `organizationId`
- derive organization from the authenticated JWT payload after setup

JWT strategy:

- `POST /api/auth/login` → returns `accessToken` (body) + `refreshToken` (httpOnly cookie)
- `POST /api/auth/refresh` → validates refresh token, rotates it, issues new access token
- `POST /api/auth/logout` → invalidates refresh token
- `POST /api/auth/signup` → creates account-only user + hashes password with bcrypt
- `POST /api/organization/setup` → creates the first organization + owner membership and returns a fresh session with organization claims
- Access token verified on every protected request via `Authorization: Bearer <token>` header
- Refresh token stored in DB and rotated on every use (old token invalidated immediately)

Create:

```txt
apps/api/src/modules/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  strategies/
    jwt.strategy.ts
    local.strategy.ts
  guards/
    jwt-auth.guard.ts
    local-auth.guard.ts
  dto/
    login.dto.ts
    signup.dto.ts
    refresh-token.dto.ts

apps/web/src/lib/auth/
  token.ts          # store/retrieve accessToken from memory
  api-client.ts     # axios instance with token injection + refresh interceptor
  use-auth.ts       # React hook for current user
  require-auth.tsx  # ProtectedRoute component
```

---

## State Management Approach

Use:

- typed feature API helpers that call the shared Axios client
- controlled React forms with Zod validation helpers where useful
- Zod for schema validation
- React Context only for global UI state (auth user, theme)
- no Redux
- no Zustand unless absolutely necessary

---

## Architecture Acceptance Criteria

- folder structure exists
- API conventions documented
- shared error handling exists
- shared validation pattern exists
- auth helpers exist
- database access is not duplicated in UI components
- business logic lives in services

---

# 3. Database Implementation

## Goal

Implement the core revenue recovery domain model using Prisma and PostgreSQL.

---

## Database Rules

- all core records must be organization-scoped
- never hard-delete critical business records
- use `deletedAt` for soft delete where needed
- every important state transition creates a `TimelineEvent`
- dashboard queries must filter by organization
- duplicate phone numbers should be blocked per organization

---

## Tenant-Scoped Prisma Service (Multi-Tenancy Guardrail)

To prevent cross-tenant data leaks and bypass errors in manually written or AI-generated queries, direct use of `PrismaService` in controllers/services is prohibited for tenant-scoped operations. Developers must use `TenantPrismaService` which is request-scoped (`Scope.REQUEST`) and extracts `organizationId` from the active JWT context.

### Scoped Client Implementation Pattern

```typescript
// apps/api/src/modules/database/tenant-prisma.service.ts
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  get client() {
    const user = (this.request as any).user;
    const organizationId = user?.organizationId;

    if (!organizationId) {
      throw new Error('TenantPrismaService: organizationId missing from request context');
    }

    return this.prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const bypassModels = ['Organization'];
            if (bypassModels.includes(model)) {
              return query(args);
            }

            // Automatic WHERE clause injection for reads
            if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              args.where = args.where || {};
              args.where.organizationId = organizationId;
            }

            // Automatic write scoping
            if (['create', 'createMany'].includes(operation)) {
              if (Array.isArray(args.data)) {
                args.data.forEach((item: any) => {
                  item.organizationId = organizationId;
                });
              } else {
                args.data = args.data || {};
                args.data.organizationId = organizationId;
              }
            }

            if (['update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(operation)) {
              args.where = args.where || {};
              args.where.organizationId = organizationId;
              if (args.data) {
                if (operation === 'upsert') {
                  args.create = args.create || {};
                  args.create.organizationId = organizationId;
                  args.update = args.update || {};
                  args.update.organizationId = organizationId;
                } else {
                  // Prevent tenant migration via update
                  delete args.data.organizationId;
                }
              }
            }

            return query(args);
          },
        },
      },
    });
  }
}
```

### Cross-Tenant Security Testing Requirement

All entities must have an integration test (`*.spec.ts` or e2e test) verifying cross-tenant access denial:
1. Seed `Organization A` and `Organization B`.
2. Seed `Member A` (belonging to Org A) and `Member B` (belonging to Org B).
3. Authenticate as a user from `Organization A`.
4. Attempt to retrieve or edit `Member B`.
5. Assert that the request fails with a `404 Not Found` (due to the query filtering by Org A's ID) or `403 Forbidden`.

---

## Core Prisma Models

Implement these models:

- Organization
- User
- Member
- Plan
- Membership
- Payment
- Workflow
- WorkflowStep
- MessageLog
- Task
- TimelineEvent

Include enums:

- UserRole
- MemberStatus
- MembershipStatus
- PaymentStatus
- WorkflowType
- WorkflowStatus
- MessageStatus
- TaskType
- TaskStatus

---

## Required Relationships

- Organization has many Users
- Organization has many Members
- Organization has many Plans
- Organization has many Workflows
- Organization has many Tasks
- Organization has many TimelineEvents
- Member has many Memberships
- Member has many Payments
- Member has many Tasks
- Member has many TimelineEvents
- Membership has many Payments
- Workflow has many WorkflowSteps

---

## Required Indexes

Add indexes for:

- organizationId
- member status
- phone number
- membership expiryDate
- membership status
- payment status
- task status
- timeline event type

---

## Migrations

Run:

```bash
npm run prisma:migrate
npm run prisma:generate
```

---

## Seed Data

Create `prisma/seed.ts`.

Seed:

- one demo organization
- one owner user
- three plans
- thirty members
- mixed statuses:
  - active
  - expiring soon
  - overdue
  - at risk
  - churned
  - reactivated
- sample memberships
- sample payments
- persisted workflow definitions and linked execution workflows
- sample tasks
- timeline events

Seed command:

```bash
npm run db:seed
```

---

## Database Acceptance Criteria

- Prisma schema compiles
- migration runs successfully
- seed data appears in Prisma Studio
- relationships work
- dashboard data can be calculated from seed data
- organization scoping exists across all core models

---

# 4. Backend Build Plan

## Module 1: Organizations

### Purpose

Create and manage tenant workspaces.

### Endpoints

```txt
GET /api/organization/current
PATCH /api/organization/current
```

### Services

```txt
getCurrentOrganization()
updateOrganization()
```

### Validations

- organization name required
- slug unique if editable

### Edge Cases

- authenticated user has no organization
- duplicate slug
- unauthorized access

### Acceptance Criteria

- authenticated user can retrieve organization
- organization is used for scoping all API calls

---

## Module 2: Members

### Purpose

Manage member records, lifecycle state, and validation-first imports.

### Endpoints

```txt
GET /api/members
POST /api/members
POST /api/members/import/dry-run   # Parse, normalize, and return validation dry-run reports
POST /api/members/import/confirm   # Atomically save resolved rows and apply duplicate strategy
GET /api/members/[id]
PATCH /api/members/[id]
DELETE /api/members/[id]
```

### Services

```txt
createMember()
dryRunImport()                     # In-memory CSV parsing, normalization (libphonenumber/date-fns), duplicate matching
confirmImport()                    # Atomic database transactions applying chosen duplicate strategies
listMembers()
getMemberById()
updateMember()
softDeleteMember()
```

### Validations

- first name required
- phone number required and must be parseable/valid via `libphonenumber`
- date strings must match supported patterns and convert successfully to ISO date format
- unique phone number per organization (flagged as duplicate warning if existing)
- valid email format if provided

### Edge Cases

- **Duplicate in File:** Multiple rows in the uploaded CSV sharing the same phone number.
- **Duplicate in Database:** Row phone number already exists in active records for the organization.
- **Unparseable Phone Number:** Phone number missing country code or invalid digits.
- **Varying Date Formats:** Mixed date columns (e.g. `12/05/2026` vs `2026-05-12`).
- **Partial/Broken Imports:** Database failure halfway through execution (must roll back atomic confirm transaction).

### Acceptance Criteria

- Import dry-run endpoint successfully categorizes rows into `validRows`, `warningRows` (duplicates), and `errorRows` (unparseable fields).
- Phone numbers are normalized to E.164 and dates to ISO before response.
- Confirm endpoint updates existing members or creates new memberships based on user-submitted resolution strategies.
- Database operations in confirm endpoint run inside a single `$transaction` block.
- Member list and detail views display correct fields, and all status changes emit `TimelineEvent` audits.

---

## Module 3: Memberships

### Purpose

Track active, expiring, overdue, churned, and renewed membership periods.

### Endpoints

```txt
POST /api/members/[id]/memberships
PATCH /api/memberships/[id]
POST /api/memberships/[id]/renew
```

### Services

```txt
createMembership()
updateMembership()
renewMembership()
calculateMembershipState()
```

### Business Rules

- expiry date drives lifecycle state
- renewal should update membership and member status
- state changes must create timeline events
- verified payment can trigger renewal

### Edge Cases

- overlapping memberships
- renewal before expiry
- expired membership already marked as paid
- missing plan but manual amount exists

### Acceptance Criteria

- membership lifecycle works correctly
- renewal flow updates dashboard values
- all key changes are auditable

---

## Module 4: Revenue State Engine

### Purpose

Core product logic for detecting revenue risk.

### Functions

```txt
calculateMemberStatus(member)
calculateMembershipStatus(membership)
detectExpiringSoon()
detectOverdue()
markAtRisk()
markChurned()
```

### Initial Rules

```txt
expiry within 5 days => EXPIRING_SOON
expiry today => RENEWAL_PENDING
expiry older than 1 day unpaid => OVERDUE
overdue more than 7 days => AT_RISK
overdue more than 30 days => CHURNED
verified payment => ACTIVE or REACTIVATED
```

### Scheduled Task / Job

```txt
Internal Job: NestJS scheduler @Cron('0 2 * * *') (Runs at 2:00 AM daily in Africa/Lagos timezone)
Admin Debug Route: POST /api/admin/jobs/update-member-states (Protected by JWT and Admin Role)
```

**Concurrency Locking (Advisory Lock):**
Before running any state engine updates, the job must attempt to acquire a database-level advisory lock using a unique 64-bit integer ID (e.g., `SELECT pg_try_advisory_lock(88001)`). If the query returns `false` (meaning the lock is held by another instance running concurrently), the job must terminate immediately without throwing an error, logging that a concurrent execution was skipped. If `true`, the job proceeds and releases the lock using `SELECT pg_advisory_unlock(88001)` upon completion or failure.

### Idempotency & Tracking Rules

- **State Idempotency**: A status transition event is only written if `currentStatus !== targetStatus`. The state engine checks the current status before executing the transition to prevent duplicate `TimelineEvent` logs.
- **JobRun Auditing**: Every execution of the state engine job must instantiate a `JobRun` record in the database:
  - Create a `JobRun` with status `RUNNING` and `startedAt = now()`.
  - Increment `processedCount` per member processed.
  - Catch single-record failures, logging error messages to `errorLog` JSON, incrementing `errorCount`, and continuing the execution loop.
  - Mark `JobRun` status as `COMPLETED` (or `PARTIAL` if errors occurred, `FAILED` if uncaught top-level error aborted the run), setting `completedAt = now()`.
  - Alert via glitchtip if status is `FAILED`.

### Acceptance Criteria

- revenue risk detection works without AI
- statuses update correctly
- timeline events created without duplicates
- job runs are logged in the `JobRun` table
- dashboard reflects updated states

---

## Module 5: Payments

### Purpose

Support transfer-based payment verification.

### Endpoints

```txt
GET /api/payments
POST /api/payments
POST /api/payments/[id]/verify
POST /api/payments/[id]/reject
```

### Services

```txt
createPendingPayment()
verifyPayment()
rejectPayment()
attachPaymentProof()
```

### Validations

- amount required
- member required
- proof optional in MVP
- rejection reason required when rejected

### Edge Cases

- verifying already verified payment
- wrong amount
- duplicate proof
- rejected payment should not renew membership
- payment without membership

### Acceptance Criteria

- admin can approve/reject payment
- verified payments update member status
- recovered revenue metric updates
- timeline event recorded

---

## Module 6: Workflows

### Purpose

Manage recovery sequence templates and workflow execution.

### Endpoints / Triggers

```txt
Internal Job: NestJS scheduler @Cron('0 3 * * *') (Runs at 3:00 AM daily in Africa/Lagos timezone)
Admin Debug Route: POST /api/admin/workflows/run (Protected by JWT and Admin Role)
GET /api/workflows
PATCH /api/workflows/[id]
```

**Concurrency Locking (Advisory Lock):**
Before running any workflow steps, the scheduler job must attempt to acquire a database-level advisory lock using a unique 64-bit integer ID (e.g., `SELECT pg_try_advisory_lock(88002)`). If the query returns `false` (concurrency block), the job terminates immediately without executing steps. If `true`, it runs and releases the lock using `SELECT pg_advisory_unlock(88002)` upon completion.

### Services

```txt
getDefaultWorkflows()
toggleWorkflowStatus()
runDueWorkflowSteps()
scheduleRecoveryStep()
```

### MVP Rule

Hardcode default workflow templates.

Do not build:

- visual workflow builder
- branching workflow editor
- complex custom automation

### Default Sequence (MVP)

```txt
Day -5: renewal reminder (WhatsApp Message)
Day +3: overdue follow-up (WhatsApp Message + Admin Task creation)

Note: All other steps (Day 0 expiry notice, Day +7 escalation, Day +14 reactivation) are explicitly deferred to Phase 2.
```

### Idempotency & Auditing Rules

- **Step Execution Idempotency**: A `WorkflowStep` with status `SENT` or `SKIPPED` must never be re-executed. The workflow execution service queries only for steps where `status = PENDING` and scheduled run conditions are met.
- **Workflow Run Tracking**: Every execution of the workflow runner job must log a corresponding `JobRun` entry (jobName = "run-workflow-steps"), tracking processed steps count, errors, and outcomes.
- **Error & Retry Handling**: If a message delivery fails (e.g. invalid phone format), the runner updates `WorkflowStep` with `status = FAILED`, sets `errorMessage = err.message`, and increments `retryCount`. If `retryCount` exceeds 3, the step status is marked permanently as `FAILED`, and a manual admin task is raised.

### Acceptance Criteria

- workflow can run against seed data
- mock messages logged in the `MessageLog` table
- workflow status can be toggled
- duplicate sends prevented via step status checks
- job executions documented in `JobRun` table

---

## Module 7: Messaging

### Purpose

Abstract WhatsApp communication behind a provider interface.

### Files

```txt
lib/messaging/provider.ts
lib/messaging/mock-provider.ts
lib/messaging/whatsapp-provider.ts
```

### Interface

```ts
export interface MessagingProvider {
  sendMessage(input: {
    to: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    providerMessageId?: string;
    status: "sent" | "failed";
    error?: string;
  }>;
}
```

### MVP Implementation

Use mock provider.

The mock provider should:
- simulate successful send
- create `MessageLog`
- create `TimelineEvent`
- allow simulated failure for testing

### Acceptance Criteria

- app can simulate reminders without real WhatsApp
- provider is swappable
- failed messages are handled safely
- message logs are visible in member timeline

---

## Module 8: Tasks

### Purpose

Provide a clear operational queue for staff.

### Endpoints

```txt
GET /api/tasks
PATCH /api/tasks/[id]
POST /api/tasks
```

### Services

```txt
createTask()
completeTask()
listOpenTasks()
cancelTask()
```

### Task Types

- verify payment
- follow up overdue member
- review at-risk member
- reactivation

### Acceptance Criteria

- tasks appear in recovery queue
- task status updates work
- payment verification completes related task
- overdue rules can create follow-up tasks

---

## Module 9: Dashboard

### Purpose

Show measurable revenue recovery value.

### Endpoint

```txt
GET /api/dashboard/summary
```

### Metrics

```txt
revenueAtRisk
overdueRevenue
recoveredRevenue
expiringMembersCount
overdueMembersCount
reactivatedMembersCount
openTasksCount
recoveryConversionRate
```

### Acceptance Criteria

- dashboard metrics are accurate
- dashboard loads quickly
- empty data handled gracefully

---

# 5. Frontend Build Plan

## Area 1: App Shell

### Pages (src/pages/)

```txt
src/pages/dashboard/DashboardPage.tsx
src/pages/members/MembersPage.tsx
src/pages/recovery/RecoveryQueuePage.tsx
src/pages/payments/PaymentsPage.tsx
src/pages/workflows/WorkflowsPage.tsx
src/pages/settings/SettingsPage.tsx
```

### Components

```txt
Sidebar
Topbar
PageHeader
MetricCard
StatusBadge
EmptyState
LoadingSkeleton
ErrorState
ConfirmDialog
```

### Acceptance Criteria

- layout works across desktop/tablet/mobile
- nav links route correctly
- protected routes redirect unauthenticated users

---

## Area 2: Authentication Screens

### Pages

```txt
/login
/signup
/forgot-password (Static "contact support" notice page; no reset flow in MVP)
```

### Auth Flow

1. User submits login form → `POST /api/auth/login`
2. Access token stored in-memory (React state / Context).
3. Refresh token stored in `httpOnly`, `Secure`, `SameSite=Lax` cookie (server-set, shared across subdomains under same root domain).
4. On app mount, before rendering protected routes, `AuthProvider` calls `POST /api/auth/refresh` silently and waits for completion to avoid a flash of unauthenticated UI.
5. Axios interceptor catches 401:
   - Uses a `isRefreshing` mutex flag and a queue of failed requests.
   - If a refresh is already in progress, new 401 requests are queued.
   - Once the refresh completes, the queue is drained and retried with the new access token.
   - Prevents parallel refresh calls (which would invalidate refresh tokens during multi-tab use).
6. Logout calls `POST /api/auth/logout` and clears local state.

### Acceptance Criteria

- signup works
- login works
- logout works
- auth guard (ProtectedRoute) works
- access token never persisted to localStorage or sessionStorage
- refresh token rotation works — old token is invalidated after use

---

## Area 3: Onboarding and Import

### Pages (src/pages/)

```txt
src/pages/onboarding/OnboardingPage.tsx
src/pages/members/MembersImportPage.tsx
```

### Components

```txt
CsvUploader
ImportPreviewTable
ImportValidationSummary
ImportSuccessState
```

### Flow

1. upload CSV
2. preview rows
3. validate rows
4. show errors/duplicates
5. import valid members
6. show success summary
7. route to dashboard

### Acceptance Criteria

- invalid rows shown clearly
- duplicate rows flagged
- user can import valid rows
- success state shows number imported

---

## Area 4: Dashboard

### Components

```txt
RevenueAtRiskCard
RecoveredRevenueCard
OverdueRevenueCard
ExpiringMembersCard
RecoveryQueuePreview
RecentTimeline
DashboardActionPanel
```

### Requirements

The dashboard must immediately answer:

```txt
Where is money leaking?
What has been recovered?
What needs action now?
```

### Acceptance Criteria

- metrics use real API
- numbers match database
- CTA directs user to recovery queue or import

---

## Area 5: Members

### Pages

```txt
/members
/members/[id]
```

### Components

```txt
MemberTable
MemberFilters
MemberSearch
MemberStatusBadge
MemberDetailHeader
MembershipHistory
PaymentHistory
MemberTimeline
MemberActions
```

### Filters

- status
- plan
- expiring
- overdue
- search by name
- search by phone

### Acceptance Criteria

- table is paginated
- search works
- filters work
- detail page shows full context
- deleted members do not show by default

---

## Area 6: Recovery Queue

### Page

```txt
/recovery
```

### Components

```txt
RecoveryTaskList
OverdueMemberCard
TaskActionMenu
TaskPriorityBadge
```

### Actions

- mark followed up
- create payment
- mark churned
- view member
- complete task

### Acceptance Criteria

- tasks grouped by urgency
- completing task updates API
- payment-related tasks connect to payment verification

---

## Area 7: Payments

### Pages

```txt
/payments
/payments/[id]
```

### Components

```txt
PaymentTable
PaymentVerificationPanel
ProofPreview
ApprovePaymentButton
RejectPaymentDialog
PaymentStatusBadge
```

### Acceptance Criteria

- pending payments visible
- approve/reject works
- payment state changes reflected in member detail
- recovered revenue updates after verification

---

## Area 8: Workflows

### Page

```txt
/workflows
```

### Components

```txt
WorkflowTemplateCard
WorkflowStepList
WorkflowStatusToggle
MockMessagePreview
WorkflowListTable
WorkflowSummaryPanel
CreateWorkflowWizard
WorkflowStepIndicator
WorkflowActionList
WorkflowReviewPanel
```

### MVP Behavior

- show persisted workflow definitions
- allow active/paused toggle
- preview sequence messages
- show a workflow list screen with operational metrics and selected workflow details
- provide a fixed create workflow wizard for the re-engagement campaign flow
- allow users to review a configured workflow and see a success confirmation after activation
- persist fixed workflow definitions through `POST /api/workflows` and update their status through `PATCH /api/workflows/:id`
- no drag-and-drop builder, branching, or arbitrary automation logic

### Acceptance Criteria

- workflow templates readable
- workflow status toggle works
- user understands sequence timing
- create workflow screens match the approved desktop designs
- wizard navigation works across details, trigger, actions, review, and success states

---

## Area 9: Settings

### Pages

```txt
/settings/profile
/settings/organization
/settings/billing
/settings/security
```

### MVP Billing

Use manual placeholder:

```txt
Current plan: Pilot
Billing is managed manually during the MVP pilot.
```

### Acceptance Criteria

- profile editable
- organization profile editable
- billing placeholder exists
- security page shows account basics

---

# 6. Core User Flows

## Flow 1: Authentication

1. user signs up
2. user creates organization
3. user is redirected to onboarding
4. user uploads member list

Completion criteria:
- user cannot access dashboard without auth
- user cannot operate without organization

---

## Flow 2: Onboarding

1. upload CSV
2. validate data
3. import members
4. calculate revenue at risk
5. prompt user to activate workflows

Completion criteria:
- user reaches first value moment in under 5 minutes

---

## Flow 3: Dashboard

1. dashboard loads summary
2. user sees revenue at risk
3. user sees recovery queue preview
4. user clicks action item

Completion criteria:
- dashboard clearly shows money leakage and next action

---

## Flow 4: Member Detail

1. user opens member profile
2. sees status, membership, payments, timeline
3. takes action: verify payment, follow up, renew, mark churned

Completion criteria:
- member context is complete and actionable

---

## Flow 5: Payment Verification

1. pending payment appears
2. admin reviews details
3. admin approves or rejects
4. system updates member/membership state
5. recovered revenue updates

Completion criteria:
- payment verification affects dashboard and timeline

---

## Flow 6: Reminder Workflow

1. job detects due workflow step
2. mock message sent
3. message log created
4. timeline event created
5. task created when human follow-up needed

Completion criteria:
- full recovery workflow can be simulated end-to-end

---

## Flow 7: Settings and Account

1. user opens settings
2. edits profile or organization info
3. views billing placeholder
4. reviews security information

Completion criteria:
- basic admin needs are covered

---

# 7. Integration Plan

## API Client

Create:

```txt
apps/web/src/lib/api/client.ts
```

Use Axios instance configured with credentials and token refresh interceptors:

```ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // HTTPOnly cookie sending for refresh tokens
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to attach in-memory access token
apiClient.interceptors.request.use((config) => {
  const token = window.__accessToken; // retrieve in-memory access token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor to handle silent token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        window.__accessToken = data.accessToken;
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        window.__accessToken = undefined;
        // Redirect to login or trigger logout action
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Auth Session Handling

Use auth helpers:

```txt
apps/api/src/modules/auth/guards/jwt-auth.guard.ts
apps/api/src/modules/auth/decorators/current-user.decorator.ts
```

Every API route must validate authorization and resolve Organization ID context from the JWT payload.

---

## Form Validation

Use Zod-backed validation helpers.

Rules:

- never trust client validation only
- duplicate validation on backend
- share schema where practical

---

## Notification Providers

MVP:

- in-app toast with Sonner
- mock WhatsApp provider

Later:

- WhatsApp Business API

---

## File Storage

MVP:
- Cloudflare R2 (S3-compatible bucket) for payment proof images
- CSV parsing is performed in-memory directly (no files are stored on disk)

Setup required:
- Environment variables: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- AWS SDK S3 client instance configured with R2 custom endpoint

Not required now:
- Supabase Storage (removed from stack)
- Uploadthing (removed from stack)
- Local directory mounts (eliminated due to VPS data loss risk)

---

## Analytics

Track events:

```txt
member_import_started
member_import_completed
workflow_started
workflow_message_sent
payment_created
payment_verified
dashboard_viewed
task_completed
```

---

# 8. Testing Plan

## Unit Tests

Test:

- revenue state calculation
- payment verification rules
- workflow due-step logic
- import validation
- task creation rules

---

## Integration Tests

Test:

- member import creates members and memberships
- payment verification updates states
- workflow run creates message logs
- dashboard metrics calculate correctly

---

## API Tests

Test:

- auth required
- organization scoping
- validation failures
- duplicate prevention
- soft delete behavior

---

## Frontend Component Tests

Test:

- dashboard renders metrics
- member table renders statuses
- import errors appear
- payment approval UI updates state

---

## E2E Tests

Use Playwright.

Critical path:

1. login/signup
2. import members
3. view dashboard
4. run state update job
5. verify payment
6. recovered revenue updates
7. complete task

---

## Manual QA Checklist

- invalid CSV handled
- duplicate member handled
- empty dashboard useful
- all errors understandable
- no duplicate workflow messages
- payment verification updates status
- mobile layout usable
- all destructive actions confirm
- timeline events appear correctly

---

# 9. Deployment Plan

## Local Development

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d db
npm install
npm run db:migrate    # prisma migrate dev inside apps/api
npm run db:seed       # prisma db seed inside apps/api
npm run dev           # Turborepo starts api (:4000) + web (:5173) in parallel
```

---

## Containerisation

Each app has its own Dockerfile in `docker/`:

- `docker/Dockerfile.api` installs workspace dependencies, generates Prisma Client, builds the NestJS API, and runs `npm run start:prod --workspace=apps/api`.
- `docker/Dockerfile.web` builds the Vite app with public build args and serves the static bundle through Nginx.

`docker/docker-compose.yml` defines three services:

```yaml
services:
  db:
    image: postgres:16-alpine
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    depends_on: [db]
  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
```

---

## Coolify VPS Deployment

Coolify manages the VPS and wraps Docker Compose:

1. Connect GitHub repo to Coolify project
2. Set build pack to **Docker Compose**
3. Point to `docker/docker-compose.yml`
4. Configure environment variables in Coolify dashboard (never commit secrets)
5. Enable Coolify automatic deploys on `main` branch push
6. Coolify provisions SSL (Let's Encrypt) for both `app.ironcore.io` (web) and `api.ironcore.io` (api)
7. Database volume is persisted via Coolify-managed Docker volume

---

## Staging Environment

- Separate Coolify environment pointing to `dev` branch
- Separate PostgreSQL volume / database name (`ironcore_retain_staging`)
- Staging env vars configured in Coolify staging environment
- Seeded staging data available

---

## Production Environment

- Coolify production environment on `main` branch
- Production PostgreSQL with backup enabled
- Production environment variables set in Coolify
- glitchtip enabled
- PostHog enabled

---

## CI/CD Pipeline

GitHub Actions runs before Coolify deploys:

```txt
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

Coolify webhook triggered on successful CI run.

---

## Database Migration Process

Local:

```bash
npm run db:migrate
```

Production (run inside container on deploy):

```bash
npm run db:migrate:deploy
```

Run the migration command before first production traffic or during a controlled release.

---

## Monitoring and Logging

Track:

- API errors
- failed jobs
- failed messages
- failed payment verifications
- slow dashboard queries
- import failures

Tools:

- GlitchTip
- PostHog
- Coolify built-in container logs

---

# 10. Codex Execution Instructions

Codex must follow these rules strictly.

## Execution Rules

1. Build one phase at a time.
2. Do not skip dependencies.
3. Do not invent features outside this plan.
4. Do not build gym management features.
5. Do not build AI features.
6. Do not build scheduling, attendance, POS, or workout tools.
7. Keep files modular.
8. Avoid files over 300 lines unless justified.
9. Preserve strict TypeScript.
10. Avoid `any`.
11. Use Zod validation for all user inputs.
12. Scope all data by organization.
13. Record TimelineEvent for important state changes.
14. Write tests for domain logic.
15. Update README/docs after major changes.
16. Stop and report blockers clearly.
17. Prefer boring reliable code over clever abstractions.

## Architecture Rules

- no business logic inside React components
- no direct Prisma calls in UI components
- service layer owns business logic
- API routes validate input and call services
- database operations must be organization-scoped
- shared utilities must be reusable and typed

## UX Rules

- every empty state should tell the user what to do next
- every workflow action should provide feedback
- every destructive action needs confirmation
- dashboard must prioritize revenue metrics
- avoid cluttered admin UI

---

# 11. Phase-by-Phase Task List

## Phase 1: Foundation

### Goal

Set up app, tooling, database, and architecture.

### Tasks

- initialize Vite + React app (`apps/web`)
- initialize NestJS backend (`apps/api`)
- install dependencies
- configure Prisma
- configure lint/prettier
- create folder structure
- create Docker Compose for local dev
- create `.env.example`
- create README setup section

### Files to Create or Modify

```txt
apps/web/vite.config.ts
apps/api/src/app.module.ts
apps/api/prisma/schema.prisma
docker/docker-compose.yml
turbo.json
.env.example
README.md
```

### Dependencies

None.

### Completion Criteria

- app runs locally
- DB connects
- lint passes
- typecheck passes

### Validation Steps

```bash
npm run dev
npm run lint
npm run typecheck
```

### Risks

- overcomplicating folder structure
- installing unnecessary libraries

---

## Phase 2: Database and Seed

### Goal

Implement domain schema.

### Tasks

- create Prisma models
- run migration
- create seed script
- seed demo data

### Files

```txt
prisma/schema.prisma
prisma/seed.ts
```

### Dependencies

Phase 1 complete.

### Completion Criteria

- seeded dashboard data exists
- Prisma Studio shows valid relations

### Validation Steps

```bash
npm run db:migrate
npm run db:seed
npm run prisma:studio
```

### Risks

- missing organization scoping
- weak indexes
- over-modeling future features

---

## Phase 3: Auth and Organization

### Goal

Enable tenant-aware authenticated access with custom JWT.

### Tasks

- implement signup (bcrypt password hash, create account-only User)
- implement organization setup (create Organization + owner OrganizationMembership)
- implement login (validate credentials directly in AuthService, issue access + refresh tokens)
- implement refresh token rotation endpoint
- implement logout (invalidate refresh token)
- build `JwtStrategy` in NestJS (LocalStrategy deferred; login credentials validated directly)
- build `JwtAuthGuard` for protected routes
- create `ProtectedRoute` component in React
- store access token in-memory; set refresh token as httpOnly cookie
- implement axios interceptor for silent token refresh
- protect dashboard routes

### Files

```txt
apps/api/src/modules/auth/
apps/web/src/lib/auth/
apps/web/src/router/
apps/web/src/pages/auth/
```

### Dependencies

Phase 2 complete.

### Completion Criteria

- users can sign up and log in
- JWT issued correctly
- refresh token rotation works
- access token never in localStorage
- organization resolves correctly from JWT payload
- dashboard protected

### Validation Steps

- create account
- log in, confirm access token in memory
- reload page, confirm silent refresh works
- logout and confirm redirect
- attempt to access protected route without token

### Risks

- refresh token race conditions on parallel requests
- forgot-password flow adds complexity (defer to post-MVP)
- exposing organization IDs insecurely

---

## Phase 4: Member Import and Management

### Goal

Allow businesses to upload and manage members.

### Tasks

- build member APIs
- build CSV parser
- build import validation
- build member list UI
- build member detail UI
- add search/filter

### Files

```txt
apps/web/src/features/members/
apps/web/src/pages/members/
apps/web/src/components/members/
apps/web/src/lib/validations/member.ts
apps/web/src/lib/validations/import.ts
```

### Dependencies

Phase 3 complete.

### Completion Criteria

- CSV import works
- duplicates handled
- members display in table
- member detail shows profile

### Validation Steps

- import valid CSV
- import invalid CSV
- import duplicate phone numbers
- search member by name/phone

### Risks

- dirty data breaking onboarding
- import UX confusing users

---

## Phase 5: Revenue State Engine

### Goal

Detect revenue risk from membership data.

### Tasks

- implement state calculation service
- implement update job
- log timeline events
- write tests

### Files

```txt
apps/api/src/modules/memberships/
apps/api/src/modules/timeline/
apps/api/src/modules/jobs/member-state.job.ts
apps/api/src/modules/jobs/member-state.job.spec.ts
```

### Dependencies

Phase 4 complete.

### Completion Criteria

- expiring/overdue statuses update correctly
- timeline events created
- tests pass

### Validation Steps

- seed members with different expiry dates
- run job
- inspect statuses
- inspect timeline

### Risks & Mitigations

- duplicate transition events (mitigated by check-and-write logic)
- incorrect date logic
- timezone issues (resolved: all date comparisons and calculations are normalized to Africa/Lagos UTC+1 timezone)

---

## Phase 6: Dashboard

### Goal

Show measurable revenue value.

### Tasks

- build dashboard summary API
- build metric card components
- build dashboard UI
- add loading/empty/error states

### Files

```txt
apps/web/src/features/dashboard/
apps/web/src/pages/dashboard/
apps/web/src/components/dashboard/
```

### Dependencies

Phase 5 complete.

### Completion Criteria

- dashboard shows revenue at risk
- dashboard shows overdue revenue
- dashboard shows recovered revenue
- dashboard data matches DB

### Validation Steps

- compare dashboard metrics with seeded records
- test empty organization state

### Risks

- misleading metrics
- slow queries
- dashboard clutter

---

## Phase 7: Payments

### Goal

Support payment verification workflow.

### Tasks

- create payment APIs
- create verification service
- create payments table UI
- create verification panel
- update member/membership status after verification
- log timeline events

### Files

```txt
apps/web/src/features/payments/
apps/web/src/pages/payments/
apps/web/src/components/payments/
apps/web/src/lib/validations/payment.ts
```

### Dependencies

Phase 6 complete.

### Completion Criteria

- pending payments visible
- approve/reject works
- verified payment updates recovered revenue
- timeline event logged

### Validation Steps

- create payment
- approve payment
- reject payment
- confirm dashboard updates

### Risks

- payment verification state bugs
- recovered revenue miscalculation

---

## Phase 8: Recovery Workflows and Messaging

### Goal

Simulate automated recovery workflows.

### Tasks

- create default workflow templates
- create mock messaging provider
- create workflow execution job
- create message logs
- build workflows page
- build fixed create workflow wizard backed by the workflow definition API
- prevent duplicate sends

### Files

```txt
apps/web/src/features/workflows/
apps/web/src/pages/workflows/
apps/web/src/components/workflows/
apps/web/src/lib/messaging/
apps/api/src/modules/workflows/workflows.job.ts
```

### Dependencies

Phase 7 complete.

### Completion Criteria

- workflow job runs
- mock messages logged
- workflow page displays sequence
- workflow list and create workflow screens are navigable
- duplicate sends prevented

### Validation Steps

- run workflow job
- inspect MessageLog
- inspect member timeline
- pause workflow and confirm no send

### Risks

- premature real WhatsApp integration
- duplicate reminders
- confusing workflow UI
- accidental scope creep into a real workflow builder before persistence and execution rules are defined

---

## Phase 9: Task Queue

### Goal

Give staff clear operational next actions.

### Tasks

- create task APIs
- generate tasks from payments and overdue logic
- build recovery queue UI
- support task completion

### Files

```txt
apps/web/src/features/tasks/
apps/web/src/pages/recovery/
apps/web/src/components/tasks/
apps/web/src/lib/validations/task.ts
```

### Dependencies

Phase 8 complete.

### Completion Criteria

- open tasks visible
- tasks grouped by urgency
- task completion works
- payment tasks connect to payment flow

### Validation Steps

- create overdue member
- generate task
- complete task
- verify timeline update

### Risks

- task queue becoming generic CRM
- unclear priorities

---

## Phase 10: Settings, Polish, and Launch Prep

### Goal

Prepare the MVP for pilot use.

### Tasks

- build settings pages
- add organization profile editing
- add billing placeholder
- add responsive cleanup
- add empty/error states
- add analytics events
- configure GlitchTip
- update documentation

### Files

```txt
apps/web/src/pages/settings/
apps/web/src/features/organizations/
apps/web/src/lib/posthog/
README.md
doc/
```

### Dependencies

Phase 9 complete.

### Completion Criteria

- all core flows usable
- app is pilot-ready
- docs updated
- errors monitored

### Validation Steps

- run full manual QA
- run E2E critical path
- deploy to staging
- smoke test production

### Risks

- polishing non-core UI
- delaying pilot for unnecessary refinements

---

# 12. MVP Completion Checklist

## Feature Checklist

- [x] Authentication
- [x] Organization setup
- [x] Protected dashboard routes
- [x] Member CSV import
- [x] Member table
- [x] Member detail page
- [x] Membership lifecycle states
- [x] Revenue state engine
- [x] Dashboard metrics
- [x] Payment verification
- [x] Recovery workflows
- [x] Mock WhatsApp provider
- [x] Message logs
- [x] Task queue
- [x] Timeline events
- [x] Settings
- [x] Billing placeholder

---

## Technical Checklist

- [x] TypeScript strict mode enabled
- [x] Prisma migrations created
- [x] Seed data available
- [x] Zod validation implemented
- [x] Organization scoping enforced
- [x] Centralized error handling exists
- [x] Domain logic tested
- [x] No duplicated business logic
- [x] No large unstructured files
- [x] No direct DB calls from UI components

---

## UX Checklist

- [x] Clear dashboard hierarchy
- [x] Useful empty states
- [x] Loading states
- [x] Error states
- [x] Consistent status badges
- [x] Tables readable
- [x] Import flow understandable
- [x] Core value visible quickly
- [x] User always knows next action
- [x] Mobile layout usable enough for MVP

---

## Security Checklist

- [x] Auth protected routes
- [x] Organization-scoped queries
- [x] No secrets exposed
- [x] Input validation
- [x] Soft deletes where needed
- [x] Timeline audit history
- [x] File upload validation if enabled
- [x] Rate limits for sensitive endpoints

---

## Deployment Checklist

- [ ] Coolify project configured
- [x] Docker Compose build verified
- [ ] Production database configured and volume persisted
- [ ] Environment variables set in Coolify
- [ ] Prisma migrations run on deploy
- [ ] SSL provisioned (Let's Encrypt via Coolify)
- [x] GlitchTip enabled
- [x] PostHog enabled
- [ ] Smoke test completed
- [ ] Backups enabled

---

## Launch-Readiness Checklist

- [x] Demo data available
- [ ] First pilot onboarding flow tested
- [x] Manual recovery workflow can run
- [x] Dashboard proves recovered revenue
- [x] Known limitations documented
- [x] README complete
- [x] Support/contact path available
- [x] Pilot feedback capture process ready

---

# 13. Build Later, Not Now

Do not let Codex build these during MVP:

- real WhatsApp integration before mock flow works
- payment processor integration
- AI churn prediction
- drag-and-drop workflow builder
- mobile app
- attendance tracking
- class scheduling
- trainer management
- advanced analytics
- multi-branch enterprise logic
- automated billing
- embedded finance
- marketplace features

These are distractions until the revenue recovery loop is proven.

---

# 14. Final Execution Principle

The first MVP does not need to be impressive.

It needs to prove one thing:

> Can IronCore Retain help a membership business detect revenue leakage, recover overdue revenue, verify payment, and show measurable value?

If yes, build deeper.

If no, more features will not save the product.
