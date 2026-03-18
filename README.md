# Gym Platform

Contract-first full-stack gym platform built on an existing FastAPI backend with a pnpm monorepo for the React web app, Expo mobile app, and a shared generated API client.

## Overview

This project now combines the existing backend with a scalable frontend ecosystem:

- member management
- authentication and role-based access
- class scheduling
- booking and waitlist handling
- attendance tracking
- Strava account connection and activity sync
- Redis-backed caching
- Celery workers for asynchronous jobs
- React web dashboard powered by TanStack Query and React Router
- Expo mobile app powered by React Navigation and TanStack Query
- shared OpenAPI-generated TypeScript types and `openapi-fetch` client runtime

The backend keeps its clean service/repository split, while the frontend apps share one generated contract so API types are not duplicated across platforms.

## Tech Stack

- Python 3.11+
- FastAPI
- PostgreSQL
- SQLAlchemy 2 async ORM
- Alembic
- Redis
- Celery
- Docker Compose
- Pydantic v2
- JWT bearer auth
- pnpm workspaces
- React + Vite + TypeScript
- Expo + React Native + TypeScript
- TanStack Query
- React Router
- React Navigation
- Tailwind CSS
- openapi-typescript
- openapi-fetch

## Project Layout

```text
apps/
  mobile/
  web/
packages/
  api-client/
  config/
app/
  api/
    routes/
  core/
  domain/
    models/
  infrastructure/
    cache/
    database/
    integrations/
  repositories/
  schemas/
  services/
  workers/
migrations/
docker/
docker-compose.yml
package.json
pnpm-workspace.yaml
requirements.txt
README.md
```

The FastAPI backend intentionally stays at the repository root so Railway, Docker, and existing Python paths continue to work without backend logic changes.

## Architecture

- `app/api`: FastAPI route layer and request dependencies
- `app/core`: settings, security, logging, exceptions
- `app/domain`: enums and SQLAlchemy models
- `app/repositories`: persistence access logic
- `app/services`: business rules and orchestration
- `app/infrastructure`: DB session, Redis, external clients
- `app/workers`: Celery app and background tasks
- `migrations`: Alembic environment and schema revisions
- `apps/web`: React + Vite dashboard using the shared API package
- `apps/mobile`: Expo app using the same shared API hooks and auth model
- `packages/api-client`: generated OpenAPI schema, typed client, shared auth/session utilities, and shared React Query hooks
- `packages/config`: shared TypeScript, ESLint, and Prettier baselines

## Frontend Workspace

### Install

```bash
pnpm install
```

### Generate the API contract

```bash
pnpm generate:api
```

This runs:

```bash
openapi-typescript https://gymappback-production-7f4e.up.railway.app/openapi.json -o packages/api-client/schema.ts
```

### Run the apps

```bash
pnpm dev:web
pnpm dev:mobile
```

### Verify the workspace

```bash
pnpm typecheck
pnpm lint
pnpm build:web
pnpm build:mobile
```

`build:mobile` exports native bundles for iOS and Android into `apps/mobile/dist/`.

## API Contract

The shared contract-first layer lives in `packages/api-client`:

- `schema.ts`: generated OpenAPI types
- `client.ts`: `openapi-fetch` client factory with auth-aware request handling
- `auth.ts`: platform-agnostic session storage and refresh-ready auth utilities
- `hooks.ts`: shared TanStack Query hooks such as `useWorkouts`, `useWorkout`, `useLogin`, and `useCreateBooking`

The web and mobile apps both consume the same package, so endpoint shapes, payloads, and response types stay aligned with the FastAPI contract.

## Local Development

### Prerequisites

- Docker Desktop
- Docker Compose
- Node.js 22+
- pnpm 10+

### Start the stack

```bash
docker compose up --build
```

### Open the API

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

### Open the frontends

- Web app: `pnpm dev:web`
- Mobile app: `pnpm dev:mobile`

### Stop the stack

```bash
docker compose down
```

## Railway Deployment

The repository now includes a root `railway.toml` so Railway has an explicit deploy config:

- build from the root `Dockerfile`
- run `alembic upgrade head` as a pre-deploy step
- start Uvicorn with Railway's injected `PORT`
- healthcheck `GET /health`
- exclude the local `.env` from Docker builds so Railway uses service variables instead of development defaults

If you want to verify or override the service manually in Railway UI:

```bash
sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
```

Recommended build command:

```bash
pip install -r requirements.txt
```

The repository also includes a `Procfile` as a fallback, but Railway should prefer `railway.toml`.

Minimum variables for a web deployment:

- `DATABASE_URL`, `DATABASE_PUBLIC_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `POSTGRESQL_URL`, or Railway Postgres variables `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`
- `SECRET_KEY` for stable JWT signing

Optional variables:

- `REDIS_URL` for cache and Celery on Railway
- `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` if you want to override the defaults explicitly

Recommended Railway Redis variables on the web service:

```text
REDIS_URL=${{Redis.REDIS_URL}}
CELERY_BROKER_URL=${{Redis.REDIS_URL}}
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
```

If `SECRET_KEY` is omitted, the app now generates an ephemeral key at boot so the service can start, but existing auth tokens will become invalid after every restart.
If Postgres is temporarily unavailable during startup, the FastAPI service now retries database readiness checks with bounded backoff before failing the boot.
If Redis variables are omitted, the web process can still boot, but it now skips Redis connection attempts and returns a clear `503` for background-job requests until a Redis service is configured.
If Redis is configured but slow to answer during startup, the web process now gives up after a short timeout and keeps booting without cache instead of hanging the whole deploy.
The backend now allows the production web app origin `https://gym-app-back-web.vercel.app` by default. For Vercel preview deployments, you can additionally set `CORS_ORIGIN_REGEX`.

Important Railway UI check:

- open your web service, then `Variables`
- make sure the database variables are present on that web service itself
- if you created a Railway Postgres service, link or reference its variables into the web service before redeploying

### Reset local database volume

```bash
docker compose down -v
```

## Environment

The repository includes a ready-to-use backend `.env` for local development and a matching `.env.example`.

Key variables:

- `SECRET_KEY`: JWT signing secret
- `DATABASE_URL`: async SQLAlchemy database URL
- `DATABASE_CONNECT_TIMEOUT_SECONDS`: timeout for each database readiness probe
- `DATABASE_STARTUP_MAX_ATTEMPTS`: number of startup probe attempts before boot fails
- `DATABASE_STARTUP_INITIAL_BACKOFF_SECONDS`: initial delay between startup probes
- `DATABASE_STARTUP_MAX_BACKOFF_SECONDS`: cap for startup retry delay
- `DATABASE_STARTUP_BACKOFF_MULTIPLIER`: backoff multiplier applied between attempts
- `REDIS_URL`: Redis cache URL
- `CORS_ORIGINS`: explicit allowed frontend origins
- `CORS_ORIGIN_REGEX`: optional regex for preview deployments such as Vercel branch URLs
- `CELERY_BROKER_URL`: Redis broker URL for Celery
- `CELERY_RESULT_BACKEND`: result backend URL for Celery
- `VITE_API_URL`: base URL used by `apps/web`
- `EXPO_PUBLIC_API_URL`: base URL used by `apps/mobile`
- `STRAVA_CLIENT_ID`: optional Strava OAuth client id
- `STRAVA_CLIENT_SECRET`: optional Strava OAuth client secret

### Google Sign-In Setup

The app uses Google Identity Services with a popup/token flow (not redirect flow).

#### Required Environment Variables

**Frontend (`apps/web/.env.local`):**

```bash
VITE_API_URL=https://your-backend-url.com
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

> **Note:** `.env.local` is gitignored and loaded at runtime. Use `.env.example` as a template only.

**Backend (`.env`):**

```bash
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
# Optional: add mobile client ID as well
GOOGLE_CLIENT_IDS=your-web-client-id.apps.googleusercontent.com,your-mobile-client-id.apps.googleusercontent.com
```

#### Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Create or select an OAuth 2.0 Client ID (Web application type)
5. Add **Authorized JavaScript origins**:

   - `http://localhost:5173` (local development)
   - `https://your-production-domain.com` (production)

6. **No redirect URI is required** for Google Identity Services popup flow

#### Mobile Google Sign-In

See [docs/google-auth-setup.md](docs/google-auth-setup.md) for complete mobile setup documentation.

#### How It Works

1. Frontend loads Google Identity Services script
2. User clicks "Sign in with Google" button
3. GSI shows popup, user authenticates with Google
4. GSI returns `id_token` directly to frontend (no redirect)
5. Frontend sends `id_token` to `POST /auth/google-login`
6. Backend validates token against configured `GOOGLE_CLIENT_ID`
7. Backend issues app JWT and creates member if needed

## Authentication

Authentication uses bearer tokens.

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google-login` (Google Identity Services popup flow)

### Auth Provider Modeling

Members are explicitly categorized by authentication origin:

| Provider | Description |
|----------|-------------|
| `local` | Registered with email + password |
| `google` | Authenticated via Google Sign-In |

The `auth_provider` field on the Member model distinguishes the authentication origin. This replaces the previous implicit approach of using empty password hash for Google users.

### Google Account Linking

Google authentication uses the stable Google `sub` (subject) identifier for account linkage.

**`google_sub` stores only the real Google subject from verified tokens.** It is never synthetic. Legacy Google accounts (created before this feature) may have `google_sub=NULL` temporarily; the first successful Google login backfills the verified `sub`.

**Linking flow:**

1. **Same `google_sub` exists**: Login succeeds
2. **No `google_sub` match, but email exists**:
   - `auth_provider=google`, `google_sub=NULL` → Backfill real `sub` from verified token, login succeeds
   - `auth_provider=local`, `google_sub=NULL` → Link Google by storing real `sub`, preserve password, login succeeds
   - `google_sub` already linked to different account → **Reject** (conflict)
3. **No account exists**: Auto-provision new member with real `google_sub`

### Security Rules

- Local login requires valid password; fails for Google-only accounts
- Google login requires verified email and valid `sub` claim
- `google_sub` is always from a verified Google token (never synthetic)
- Account linking is conservative: same Google identity cannot be reassigned to another email
- Legacy accounts may have `google_sub=NULL` until first successful Google login

### Backend Environment Variables

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_IDS=web-client-id,mobile-client-id  # optional: allow multiple
```

## Roles

Supported member roles:

- `member`
- `instructor`
- `admin`

Examples:

- admins can manage members and classes
- instructors can manage their own classes and mark attendance
- members can manage their own bookings, integrations, and profile data

## Main API Areas

### Members

- `POST /members`
- `GET /members`
- `GET /members/{id}`
- `PATCH /members/{id}`

### Classes

- `POST /classes`
- `GET /classes`
- `GET /classes/{id}`
- `PATCH /classes/{id}`
- `DELETE /classes/{id}`

### Bookings

- `POST /bookings`
- `DELETE /bookings/{id}`
- `GET /members/{id}/bookings`

### Attendance

- `POST /attendance`
- `GET /attendance/class/{classId}`
- `GET /attendance/member/{memberId}`

### Strava / Activities

- `POST /integrations/strava/connect`
- `POST /activities/sync`
- `GET /members/{id}/activities`

## Booking and Waitlist Logic

Booking is designed to be concurrency-safe.

The service layer uses:

- database transactions
- row-level locking on the class row
- booking count checks inside the transaction
- automatic waitlist promotion after cancellation

This prevents overbooking when multiple users reserve the same class at the same time.

## Background Jobs

Celery services included in Docker Compose:

- `celery_worker`
- `celery_beat`

Registered tasks:

- `app.tasks.sync_member_activities`
- `app.tasks.send_class_reminders`

## Database and Migrations

Alembic is configured and the initial schema migration is included.

Run migrations manually if needed:

```bash
alembic upgrade head
```

Create a new autogenerated migration:

```bash
alembic revision --autogenerate -m "describe_change"
```

## Redis Usage

Redis is used for:

- Celery message brokering
- Celery result storage
- caching frequently requested member and class detail responses

## Useful Commands

Run the API locally outside Docker:

```bash
uvicorn app.main:app --reload
```

Run the worker locally:

```bash
celery -A app.workers.celery_app.celery_app worker --loglevel=info
```

Run beat locally:

```bash
celery -A app.workers.celery_app.celery_app beat --loglevel=info
```

Inspect running containers:

```bash
docker compose ps
```

Show logs:

```bash
docker compose logs -f api
docker compose logs -f celery_worker
docker compose logs -f celery_beat
```

## CI/CD

- Railway continues to deploy the backend from the repository root.
- Vercel can target `apps/web` for the web client.
- Expo EAS is configured in `apps/mobile/eas.json` for mobile releases.
- GitHub Actions frontend CI is available in `.github/workflows/frontend-ci.yml` and runs API generation, typechecking, linting, and both app builds.

### Vercel web setup

Prepare the Vercel project with these settings:

- Framework Preset: `Vite`
- Root Directory: `apps/web`
- Node.js Version: `22.x`
- Install Command: leave default to use `apps/web/vercel.json`, or set `cd ../.. && pnpm install --frozen-lockfile`
- Build Command: leave default to use `apps/web/vercel.json`, or set `cd ../.. && pnpm vercel:build:web`
- Output Directory: `dist`

Required environment variable:

- `VITE_API_URL=https://gymappback-production-7f4e.up.railway.app`

The web app’s Vercel project config is committed at `apps/web/vercel.json`, so the monorepo can be deployed from this repository without moving the FastAPI backend out of the root.

## Notes

- The Strava connect endpoint stores access credentials supplied by a client-side OAuth flow or admin tooling.
- The class model file is named `gym_class.py` because `class.py` would conflict with Python syntax.
- The local Docker stack has been verified to serve `/health` and `/docs`.
