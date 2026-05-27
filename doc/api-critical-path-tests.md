# API Critical Path Tests

Date: 2026-05-27

## Purpose

Phase 10F requires the stale API E2E starter test to be replaced with pilot-critical coverage.

The API E2E suite now checks the HTTP contracts for:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `POST /api/payments/:id/verify`
- `POST /api/admin/jobs/update-member-states`

## What The Suite Verifies

- The pilot smoke-check health endpoint responds successfully.
- Login sets the refresh cookie and does not leak the raw refresh token in the JSON body.
- Invalid auth payloads are rejected by validation before hitting the service layer.
- Dashboard summary is protected by bearer auth and resolves organization-scoped data.
- Payment verification uses the caller identity and organization context.
- Admin recovery-job endpoints reject staff users and allow admin users.

## How To Run

From the repository root:

```bash
npm run test:e2e --workspace=apps/api
```

## Test Design Note

The suite uses in-memory HTTP injection instead of opening a real network port. That keeps the tests stable in CI and sandboxed environments while still exercising NestJS controllers, guards, validation, global prefixing, and response shaping at the HTTP boundary.
