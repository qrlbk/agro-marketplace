#!/usr/bin/env bash
# Запуск: из корня проекта после docker compose up -d
# Использование: ./scripts/init_local.sh   или   bash scripts/init_local.sh

set -e
cd "$(dirname "$0")/../backend"

echo "Waiting for PostgreSQL on 5433..."
for i in $(seq 1 30); do
  if command -v nc >/dev/null 2>&1 && nc -z localhost 5433 2>/dev/null; then
    echo "PostgreSQL is up."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "PostgreSQL did not start. Run: docker compose -f docker/docker-compose.yml up -d"
    exit 1
  fi
  sleep 1
done

echo "Running migrations..."
alembic upgrade head

echo "Seeding database..."
python -m scripts.seed

echo "Done. Start API with: cd backend && uvicorn app.main:app --reload"
