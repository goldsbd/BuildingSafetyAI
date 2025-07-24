#!/bin/bash

# Run database migrations

set -e

echo "Running BuildingSafetyAI database migrations..."

# Database connection parameters
DB_HOST="localhost"
DB_USER="pgadmin"
DB_PASSWORD="Dell5100"
DB_NAME="bsaidb"

# Export password to avoid prompts
export PGPASSWORD=$DB_PASSWORD

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Run migrations
for migration in "$PROJECT_ROOT"/backend/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Running migration: $(basename $migration)"
        psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$migration"
    fi
done

echo "Migrations completed successfully!"

# Unset password
unset PGPASSWORD