#!/bin/bash

# Script to check document categories in the database

echo "Checking document categories in the database..."
echo ""

# Connect to PostgreSQL and run queries
PGPASSWORD=Dell5100 psql -h localhost -U pgadmin -d bsaidb << EOF
-- Show all categories
\echo 'Available Categories:'
\echo '===================='
SELECT id, name, code FROM document_categories ORDER BY name;

\echo ''
\echo 'Documents by Category:'
\echo '====================='
-- Count documents by category
SELECT 
    COALESCE(dc.name, 'No Category') as category_name,
    COUNT(d.id) as document_count
FROM documents d
LEFT JOIN document_categories dc ON d.category_id = dc.id
GROUP BY dc.name
ORDER BY document_count DESC;

\echo ''
\echo 'Sample Documents with Categories:'
\echo '================================'
-- Show sample documents with their categories
SELECT 
    d.original_filename,
    d.category_id,
    dc.name as category_name,
    p.name as project_name
FROM documents d
LEFT JOIN document_categories dc ON d.category_id = dc.id
LEFT JOIN projects p ON d.project_id = p.id
LIMIT 10;

\echo ''
\echo 'Documents without Categories:'
\echo '============================'
SELECT COUNT(*) as documents_without_category
FROM documents 
WHERE category_id IS NULL;
EOF

echo ""
echo "Done!"