#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

databases=("auth_db" "user_db" "appraisal_db" "goal_db")

for db in "${databases[@]}"; do
  echo "Backing up $db..."
  docker exec eas-postgres pg_dump -U postgres $db > \
    $BACKUP_DIR/${db}_${TIMESTAMP}.sql
done

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

echo "Backup complete: $BACKUP_DIR"
