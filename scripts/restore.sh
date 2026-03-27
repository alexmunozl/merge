#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup_file>"
    echo "   Example: $0 backups/db_backup_20231201_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Starting restore process..."

# Stop application
echo "⏹️ Stopping application..."
docker-compose stop app

# Restore database
echo "🗃️ Restoring database..."
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U opera_user -d opera_merger
else
    cat "$BACKUP_FILE" | docker-compose exec -T postgres psql -U opera_user -d opera_merger
fi

# Start application
echo "▶️ Starting application..."
docker-compose start app

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
sleep 10

# Check health
if curl -f http://localhost/api/system/health > /dev/null 2>&1; then
    echo "✅ Restore completed successfully!"
else
    echo "❌ Application health check failed after restore"
    docker-compose logs app
    exit 1
fi

echo "🎉 Database restored from: $BACKUP_FILE"
