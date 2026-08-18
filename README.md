# Mosaic

Mosaic is a photo-first social network built with React, Vinext, and TypeScript. This repository is the web application and server boundary; authentication and project-scoped authorization are provided by the separate Central RBAC service.

## Phase 1 foundation

The initial foundation includes:

- the responsive Mosaic feed interface;
- email/password registration, verification, recovery, and login flows;
- capability-gated mobile/OTP entry that stays disabled until SMS is configured;
- a server-only Central RBAC adapter;
- secure HTTP-only access and rotating refresh cookies;
- same-origin protection for authentication mutations;
- stable request IDs and API error envelopes;
- health, readiness, and version endpoints;
- type checking, linting, production build, and rendered-route tests.

## Local setup

Requirements: Node.js 24 or another runtime satisfying the version in `package.json`.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Configure a separate Mosaic project in Central RBAC, then set its URL and one-time project key in `.env.local`. The project key must remain server-only and must never be exposed through client environment variables.

With the Central RBAC service running and its operator credential available, register Mosaic once:

```bash
CENTRAL_RBAC_URL=https://auth.example.com \
CENTRAL_RBAC_ADMIN_KEY=<operator-secret> \
npm run auth:register-project
```

The command prints the new project key once. Move it directly into the deployment secret manager; do not add it to `.env.example`, source control, tickets, or chat.

```text
CENTRAL_RBAC_URL=https://central-auth-pe9z.onrender.com
CENTRAL_RBAC_PROJECT_API_KEY=<Mosaic project key>
MOSAIC_EMAIL_VERIFICATION_ENABLED=true
MOSAIC_MOBILE_OTP_ENABLED=false
```

The two Mosaic capability switches must mirror the corresponding Central RBAC
deployment flags. Keep mobile OTP disabled until Central RBAC has a working SMS
provider. These switches are safe to expose through `GET /api/auth/capabilities`;
provider credentials and the Central RBAC project key remain server-only.

## Local Docker setup

Docker runs the production build locally on `http://127.0.0.1:3000` and uses
the deployed Central Auth service by default.

```bash
cp .env.example .env
# Replace CENTRAL_RBAC_PROJECT_API_KEY in .env with the Mosaic project key.
docker compose up --build
```

The feed and operational health endpoint can start without the project key,
but registration, login, OTP, session, and readiness calls deliberately fail
closed until a valid Mosaic project key is configured.

Stop the local stack with:

```bash
docker compose down
```

## Authentication boundary

The browser calls same-origin `/api/auth/*` routes. Mosaic adds the Central RBAC project credential on the server, stores access and refresh tokens in HTTP-only cookies, and removes both tokens from browser-visible JSON responses.

Available browser routes:

- `POST /api/auth/email/register`
- `POST /api/auth/email/verification/request`
- `POST /api/auth/email/verify`
- `POST /api/auth/password/login`
- `POST /api/auth/password/recovery/request`
- `POST /api/auth/password/recovery/complete`
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/auth/capabilities`

Operational routes:

- `GET /api/health`
- `GET /api/ready`
- `GET /api/version`

## Validation

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

`npm run ci` executes all four checks in release order.

## Next Phase 1 work

- Register Mosaic in the deployed Central RBAC environment and configure delivery providers.
- Add the application PostgreSQL schema for profiles, idempotency, audit records, and outbox events.
- Add durable worker processing, retries, dead-letter handling, telemetry, and alerting.
- Add live Central RBAC contract tests and browser registration/login/logout smoke tests in staging.
