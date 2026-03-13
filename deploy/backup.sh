#!/usr/bin/env bash
###############################################################################
# backup.sh — Automated database backup for EAS (monolith: eas_db)
# Add to crontab: 0 2 * * * /opt/eas/deploy/backup.sh >> /var/log/eas-backup.log 2>&1
###############################################################################
set -euo pipefail

APP_DIR="/opt/eas"
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

source "$APP_DIR/.env"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting EAS database backup..."

# Dump the consolidated database
docker exec eas-postgres pg_dump \
  -U "${POSTGRES_USER}" \
  --format=custom \
  --compress=9 \
  eas_db > "$BACKUP_DIR/eas_db_${TIMESTAMP}.dump"

FILESIZE=$(du -h "$BACKUP_DIR/eas_db_${TIMESTAMP}.dump" | cut -f1)
echo "[$(date)] Backup created: eas_db_${TIMESTAMP}.dump ($FILESIZE)"

# Prune old backups
DELETED=$(find "$BACKUP_DIR" -name "*.dump" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "[$(date)] Pruned $DELETED backup(s) older than ${RETENTION_DAYS} days"

echo "[$(date)] Backup complete."
