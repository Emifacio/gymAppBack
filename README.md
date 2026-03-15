# Gym Backend

Production-ready backend scaffold for a gym management platform built with FastAPI, PostgreSQL, SQLAlchemy async, Alembic, Redis, Celery, and Docker.

## Stack

- Python 3.11+
- FastAPI
- PostgreSQL
- SQLAlchemy 2 async ORM
- Alembic migrations
- Redis for caching and Celery transport
- Celery worker and beat
- Pydantic v2
- JWT authentication

## Project Structure

```text
app/
  api/
  core/
  domain/
  infrastructure/
  repositories/
  schemas/
  services/
  workers/
migrations/
docker/
docker-compose.yml
requirements.txt
```

## Quick Start

1. Start the platform:

```bash
docker compose up --build
```

2. Open the API docs:

```text
http://localhost:8000/docs
```

## Default Environment

The repository includes a ready-to-use `.env` for local development. Update `SECRET_KEY` and Strava credentials before production use.

## Authentication

- `POST /auth/register` creates the first account as an admin automatically for bootstrap.
- All later registrations default to the `member` role.
- Use the returned bearer token in the `Authorize` button inside Swagger.

## Main Domains

- Members: profile management, roles, membership status
- Classes: scheduling, instructors, capacity and status
- Bookings: transactional reservations, capacity checks, waitlist promotion
- Attendance: instructor/admin attendance marking and history
- Integrations: Strava account connection and background activity sync

## Booking Concurrency

Booking creation and cancellation use:

- database transactions
- row-level locking on the class record
- deterministic waitlist promotion

This prevents overbooking during concurrent reservation attempts.

## Background Tasks

- `app.tasks.sync_member_activities`: fetches Strava activities and stores simplified activity records
- `app.tasks.send_class_reminders`: scans upcoming classes and is scheduled by Celery beat

## Local Development Commands

```bash
alembic upgrade head
uvicorn app.main:app --reload
celery -A app.workers.celery_app.celery_app worker --loglevel=info
celery -A app.workers.celery_app.celery_app beat --loglevel=info
```

## Notes

- Redis caching is applied to class and member detail reads.
- The Strava connect endpoint stores OAuth tokens supplied by a client-side OAuth flow or admin tooling.
- Alembic is configured for autogeneration using the SQLAlchemy metadata in `app.infrastructure.database.base.Base`.
- The class model file uses `gym_class.py` instead of `class.py` because `class` is a reserved Python keyword.
