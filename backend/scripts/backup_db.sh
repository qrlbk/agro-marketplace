#!/usr/bin/env bash
# Backup PostgreSQL database. Usage:
#   ./backup_db.sh [output_dir]
# Output: output_dir/agro_marketplace_YYYYMMDD_HHMMSS.sql.gz (default: backend/backups)
# Requires: pg_dump and gzip. For Docker: run from host with DATABASE_URL or use exec into postgres container.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="${1:-$BACKEND_ROOT/backups}"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="$OUTPUT_DIR/agro_marketplace_${TIMESTAMP}.sql.gz"

if [ -f "$BACKEND_ROOT/.env" ]; then
  set -a
  source "$BACKEND_ROOT/.env"
  set +a
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set. Set it in backend/.env or environment." >&2
  exit 1
fi

# pg_dump expects postgresql:// URL (not postgresql+asyncpg://)
PG_URL="${DATABASE_URL/postgresql+asyncpg:/postgresql:}"
pg_dump "$PG_URL" | gzip > "$FILE"
echo "Backup written to $FILE"
