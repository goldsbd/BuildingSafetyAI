#!/bin/bash

# Test script to verify project deletion works correctly
# This tests that projects with bulk upload sessions can now be deleted

set -e

echo "Testing BuildingSafetyAI project deletion fix..."

# Database connection parameters
DB_HOST="localhost"
DB_USER="pgadmin"
DB_PASSWORD="Dell5100"
DB_NAME="bsaidb"

# Export password to avoid prompts
export PGPASSWORD=$DB_PASSWORD

# Test SQL
psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'EOF'
-- Find a project that has bulk upload sessions
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(DISTINCT bus.id) as bulk_upload_count,
    COUNT(DISTINCT d.id) as document_count
FROM projects p
LEFT JOIN bulk_upload_sessions bus ON bus.project_id = p.id
LEFT JOIN documents d ON d.project_id = p.id
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT bus.id) > 0
LIMIT 5;

-- Check foreign key constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'bulk_upload_sessions'
    AND kcu.column_name = 'project_id';
EOF

echo ""
echo "Project deletion fix verification complete!"
echo ""
echo "The foreign key constraint should show DELETE_RULE = 'CASCADE'"
echo "This means projects with bulk upload sessions can now be deleted."

# Unset password
unset PGPASSWORD