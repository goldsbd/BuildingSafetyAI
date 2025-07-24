#!/bin/bash

# BuildingSafetyAI Database Setup Script
# This script creates the bsaidb database and required extensions

set -e

echo "Setting up BuildingSafetyAI database..."

# Database connection parameters
DB_HOST="localhost"
DB_USER="pgadmin"
DB_PASSWORD="Dell5100"
DB_NAME="bsaidb"

# Export password to avoid prompts
export PGPASSWORD=$DB_PASSWORD

# Since pgadmin user already exists with the password, we'll use it directly

# Check if database exists (connect to postgres database to check)
if psql -h $DB_HOST -U $DB_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "Database $DB_NAME already exists. Dropping and recreating..."
    psql -h $DB_HOST -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
fi

# Create database
echo "Creating database $DB_NAME..."
psql -h $DB_HOST -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

# Connect to the new database and create extensions
echo "Setting up database extensions..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
\$\$ language 'plpgsql';

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

echo "Database setup completed successfully!"
echo "Connection string: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST/$DB_NAME"

# Unset password
unset PGPASSWORD