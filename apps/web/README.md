# IronCore Retain Web App

Vite + React SPA for the IronCore Retain MVP.

The web app exposes the recovery-focused operator experience: signup, organization setup, dashboard metrics, member management, recovery queue, payment verification, workflow review, task management, and settings.

The planned public web surface is a B2B SaaS landing page at `/`. Once that route is implemented, the protected product dashboard should live at `/dashboard` and all operator routes should remain behind `ProtectedRoute`.

## Local Development

From the repository root:

```bash
npm install
cp .env.example .env
npm run dev --workspace=apps/web
```

The Vite dev server defaults to `http://localhost:5173`.

Run the API and database alongside it when using authenticated or data-backed screens:

```bash
docker compose -f docker/docker-compose.yml up -d db
npm run dev --workspace=apps/api
```

## Useful Commands

```bash
npm run build --workspace=apps/web
npm run typecheck --workspace=apps/web
npm run lint --workspace=apps/web
npm run preview --workspace=apps/web
```

## Routes

Planned public routes:

```txt
/
/login
/signup
/forgot-password
```

Protected product routes:

```txt
/onboarding/company
/dashboard
/members
/members/:memberId
/payments
/payments/record
/payments/record/success/:paymentId
/payments/:paymentId
/recovery
/workflows
/workflows/new
/tasks
/settings
/settings/organization
/settings/billing
/settings/users
/settings/notifications
/settings/integrations
/settings/security
/settings/audit-log
```

Until the landing-page route migration is implemented, the current router may still serve the dashboard at `/`. The documentation target is public `/` for SaaS positioning and protected `/dashboard` for the app.

## Frontend Structure

```txt
src/
  components/     Reusable UI for dashboard, members, payments, tasks, workflows
  features/       Typed API helpers and feature models
  lib/            API client, auth, validation, monitoring, support, PostHog
  pages/          Route-level page components
  router/         React Router configuration
```

## Auth Notes

- Access tokens are kept in memory.
- Refresh tokens are stored in an httpOnly cookie set by the API.
- The API client sends credentials and retries protected requests after silent refresh.
- Tokens must not be persisted to localStorage or sessionStorage.
