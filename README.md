# Agro Marketplace MVP

Monorepo: FastAPI backend + React/TypeScript frontend. PostgreSQL, Redis, JWT auth, catalog, garage, checkout with order split, AI price normalization, 1C webhook, SMS gateway.

## Quick start

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
cp .env.example .env  # edit DATABASE_URL, REDIS_URL, JWT_SECRET, SMS_*, OPENAI_API_KEY
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Optional: run PostgreSQL + Redis via Docker
docker compose -f docker/docker-compose.yml up -d
```

## Structure

- `backend/` — FastAPI, SQLAlchemy, Alembic, Redis, JWT, OTP, catalog, garage, cart, checkout, AI agents, webhooks
- `frontend/` — React 18, TypeScript, routing, catalog, garage, cart, admin
- `docker/` — docker-compose for dev (PostgreSQL, Redis)
