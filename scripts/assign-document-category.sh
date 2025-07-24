#!/bin/bash

# Script to assign a category to the existing document based on its filename

echo "Assigning category to existing document..."
echo ""

# The document filename suggests it's a "Change Control Plan"
# Let's find the category ID for "Change Control Plan" and assign it

PGPASSWORD=Dell5100 psql -h localhost -U pgadmin -d bsaidb << EOF
-- First, let's see the document and the matching category
\echo 'Document to update:'
SELECT id, original_filename, category_id FROM documents;

\echo ''
\echo 'Matching category:'
SELECT id, name, code FROM document_categories WHERE name = 'Change Control Plan';

-- Update the document with the correct category
\echo ''
\echo 'Updating document category...'
UPDATE documents 
SET category_id = (
    SELECT id FROM document_categories WHERE name = 'Change Control Plan'
)
WHERE original_filename LIKE '%ChangeControlPlan%';

-- Verify the update
\echo ''
\echo 'Verification - Document after update:'
SELECT 
    d.id,
    d.original_filename,
    d.category_id,
    dc.name as category_name
FROM documents d
LEFT JOIN document_categories dc ON d.category_id = dc.id;
EOF

echo ""
echo "Done! The document has been assigned to the 'Change Control Plan' category."