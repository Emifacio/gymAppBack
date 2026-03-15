# Gym Backend

Backend platform for gym operations built with FastAPI, PostgreSQL, SQLAlchemy async, Alembic, Redis, Celery, Docker, and JWT authentication.

## Overview

This project implements the core backend domains for a gym management system:

- member management
- authentication and role-based access
- class scheduling
- booking and waitlist handling
- attendance tracking
- Strava account connection and activity sync
- Redis-backed caching
- Celery workers for asynchronous jobs

The codebase is structured around a clean service/repository split so it stays maintainable as the product grows.

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

## Project Layout

```text
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
requirements.txt
README.md
```

## Architecture

- `app/api`: FastAPI route layer and request dependencies
- `app/core`: settings, security, logging, exceptions
- `app/domain`: enums and SQLAlchemy models
- `app/repositories`: persistence access logic
- `app/services`: business rules and orchestration
- `app/infrastructure`: DB session, Redis, external clients
- `app/workers`: Celery app and background tasks
- `migrations`: Alembic environment and schema revisions

## Local Development

### Prerequisites

- Docker Desktop
- Docker Compose

### Start the stack

```bash
docker compose up --build
```

### Open the API

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

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
- `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` if you want values separate from `REDIS_URL`

If `SECRET_KEY` is omitted, the app now generates an ephemeral key at boot so the service can start, but existing auth tokens will become invalid after every restart.
If Redis variables are omitted, the web process can still boot, but Redis-backed cache and worker features will not work until a Redis service is configured.

Important Railway UI check:

- open your web service, then `Variables`
- make sure the database variables are present on that web service itself
- if you created a Railway Postgres service, link or reference its variables into the web service before redeploying

### Reset local database volume

```bash
docker compose down -v
```

## Environment

The repository includes a ready-to-use `.env` for local development and a matching `.env.example`.

Key variables:

- `SECRET_KEY`: JWT signing secret
- `DATABASE_URL`: async SQLAlchemy database URL
- `REDIS_URL`: Redis cache URL
- `CELERY_BROKER_URL`: Redis broker URL for Celery
- `CELERY_RESULT_BACKEND`: result backend URL for Celery
- `STRAVA_CLIENT_ID`: optional Strava OAuth client id
- `STRAVA_CLIENT_SECRET`: optional Strava OAuth client secret

## Authentication

Authentication uses bearer tokens.

- `POST /auth/register`
- `POST /auth/login`

Behavior:

- the first registered account is automatically created as `admin`
- later self-registrations default to `member`
- protected endpoints expect `Authorization: Bearer <token>`

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

## Notes

- The Strava connect endpoint stores access credentials supplied by a client-side OAuth flow or admin tooling.
- The class model file is named `gym_class.py` because `class.py` would conflict with Python syntax.
- The local Docker stack has been verified to serve `/health` and `/docs`.
