---
name: gymapp-railway-deploy
description: Prepare, deploy, and debug the GymApp FastAPI backend on Railway. Use when Codex needs to make this repository Railway-ready, fix Railway build or startup failures, verify `railway.toml` or `Dockerfile` or `Procfile`, align environment variables for PostgreSQL, Redis, and Celery, or explain the remaining Railway-side setup for this project.
---

# GymApp Railway Deploy

Prepare this repository for Railway, validate the app entrypoints and environment configuration, and debug deployment failures with project-specific assumptions.

Prefer repo changes and verification over generic advice. Use the files already present in this project as the source of truth.

## Quick Start

1. Read `README.md`, `railway.toml`, `Dockerfile`, `Procfile`, `requirements.txt`, `.env.example`, `app/main.py`, and `app/workers/celery_app.py`.
2. Confirm the web service boots the FastAPI app from `app.main:app` and listens on Railway's `PORT`.
3. Confirm the health endpoint is `GET /health`, not just `/`.
4. Check whether migrations, Redis, and Celery require separate Railway services or startup commands.
5. After edits, run lightweight verification commands and summarize any remaining Railway-side steps for the user.

## Deployment Audit

### App Entrypoint

- Confirm `app/main.py` exposes `app = FastAPI(...)`.
- Prefer `railway.toml` as the primary Railway config when it exists.
- Ensure the startup command binds to `0.0.0.0` and Railway's port, for example:

```bash
sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
```

- Treat `Procfile` as fallback metadata, not the main source of truth, when `railway.toml` is present.

### Runtime Dependencies

- Check `requirements.txt` for the actual runtime stack used by GymApp: FastAPI, Uvicorn, SQLAlchemy, Alembic, Redis, Celery, Pydantic v2, and PostgreSQL driver support.
- If a failure points to missing build tooling or native packages, prefer the smallest fix that matches the existing Docker image strategy.
- Do not add dependencies speculatively. Tie each change to an observed import or runtime requirement.

### Environment Variables

- Verify the app can resolve database configuration from Railway-provided values or a direct `DATABASE_URL`.
- Confirm `SECRET_KEY` is required for JWT signing and document it if missing from setup instructions.
- Confirm Redis and Celery settings map cleanly to `REDIS_URL` or the project's equivalent broker variables.
- Keep `.env.example` aligned with any newly required settings.

### Celery and Background Work

- Check `app/workers/celery_app.py` before changing worker commands.
- If the user asks for full Railway deployment guidance, separate the web service from background workers when Celery is enabled.
- Recommend a dedicated worker service command only when the repository actually uses Celery tasks at runtime.

## Verification

Prefer fast, local verification before declaring Railway-ready:

```bash
python -m compileall app migrations
docker compose up --build
curl http://localhost:8000/health
```

If Docker is unavailable or too heavy for the task, use the lightest meaningful check instead and say what was not verified.

## Debugging Railway Failures

### Build Failures

- Check for missing dependencies, invalid package pins, or Dockerfile copy/install order issues.
- Check whether the image installs from the correct `requirements.txt` at the repo root.

### Startup Failures

- Check the module path in the start command.
- Check whether the process binds to `PORT`.
- Check whether migrations run before the app starts and whether that ordering is intentional.

### Runtime Failures

- Check missing environment variables first.
- Check database connectivity and URL parsing next.
- Check Redis or Celery broker configuration when worker startup or background jobs fail.

## Output

When using this skill:

- Make the smallest repo changes needed to unblock Railway deployment.
- Name the exact files changed and the verification performed.
- Separate confirmed fixes from inferred Railway UI steps.
- If Railway access is unavailable, prepare the repo fully and then list the remaining manual steps clearly.
