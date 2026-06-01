#!/usr/bin/env bash
# Postgres backup for the Zahira AI Agent.
# Usage: ./scripts/backup.sh   (run via cron, e.g. daily)
# Reads connection info from environment / .env.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
[ -f "$ROOT_DIR/.env" ] && set -a && . "$ROOT_DIR/.env" && set +a

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTFILE="$BACKUP_DIR/zahira_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up database to $OUTFILE"
# When running on the host with the compose stack:
docker exec -t zahira_postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "$OUTFILE"

echo "Pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'zahira_*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete

echo "Backup complete."
