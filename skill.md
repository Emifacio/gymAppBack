# Untitled

# Agent Skill: Deploy FastAPI Backend to Railway

You are an expert DevOps engineer.

Your task is to **prepare and deploy a FastAPI backend to Railway successfully**.

The backend uses the following stack:

```
Python
FastAPI
PostgreSQL
Redis
Celery
```

The goal is to ensure the project **deploys successfully on Railway without build failures**.

---

# Step 1 — Validate Project Structure

Ensure the repository follows this structure:

```
project-root/
│
├ app/
│   ├ main.py
│   ├ api/
│   ├ services/
│   ├ repositories/
│   └ models/
│
├ requirements.txt
├ Dockerfile
├ .env.example
├ README.md
└ railway.json (optional)
```

The FastAPI application must be defined in:

```
app/main.py
```

Example:

```
fromfastapiimportFastAPI

app=FastAPI()

@app.get("/")
defhealth():
return {"status":"ok"}
```

---

# Step 2 — Validate Dependencies

Ensure `requirements.txt` includes at least:

```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
redis
celery
python-dotenv
alembic
pydantic
```

If Celery or Redis are used, include them as dependencies.

---

# Step 3 — Configure Server Start Command

Railway requires the application to listen on the **PORT environment variable**.

The correct command is:

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

This must be configured either in:

- Dockerfile

• Railway start command

---

# Step 4 — Create a Production Dockerfile

If using Docker, generate this Dockerfile:

```
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

This ensures compatibility with Railway's dynamic ports.

---

# Step 5 — Prepare Environment Variables

The system must support the following variables:

```
DATABASE_URL
REDIS_URL
SECRET_KEY
```

Example `.env.example`:

```
DATABASE_URL=postgresql://user:password@host:5432/db
REDIS_URL=redis://localhost:6379
SECRET_KEY=change_this_secret
```

These variables must be configured in Railway's environment settings.

---

# Step 6 — Configure Celery Worker

If Celery is used, create a worker service with:

```
celery -A app.workers.celery_app worker --loglevel=info
```

Ensure Redis is used as the broker:

```
CELERY_BROKER_URL=${REDIS_URL}
```

---

# Step 7 — Railway Deployment Steps

The agent must perform:

1️⃣ Connect the GitHub repository to Railway

2️⃣ Create the API service

3️⃣ Add PostgreSQL plugin

4️⃣ Add Redis plugin

5️⃣ Configure environment variables

6️⃣ Deploy automatically from GitHub

---

# Step 8 — Verify Deployment

After deployment verify:

Health endpoint:

```
GET /
```

Expected response:

```
{"status":"ok"}
```

OpenAPI documentation must be available at:

```
/docs
```

---

# Step 9 — Debug Deployment Failures

If deployment fails, inspect logs and check:

- missing dependencies

• incorrect start command

• incorrect module path

• missing environment variables

• database connection errors

Fix issues and redeploy.

---

# Expected Outcome

The deployed API must be accessible at:

```
https://<project>.up.railway.app
```

With working endpoints and OpenAPI docs.