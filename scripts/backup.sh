#!/bin/bash

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

echo "💾 Starting backup process..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "🗃️ Backing up database..."
docker-compose exec -T postgres pg_dump -U opera_user opera_merger > $DB_BACKUP_FILE

# Compress backup
echo "🗜️ Compressing backup..."
gzip $DB_BACKUP_FILE

# Remove old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "✅ Backup completed: ${DB_BACKUP_FILE}.gz"
echo "📊 Backup size: $(du -h ${DB_BACKUP_FILE}.gz | cut -f1)"
