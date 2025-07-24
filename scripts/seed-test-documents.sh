#!/bin/bash

echo "Creating test documents with categories..."
echo ""

# First, let's get the project ID
PROJECT_ID=$(PGPASSWORD=Dell5100 psql -h localhost -U pgadmin -d bsaidb -t -c "SELECT id FROM projects LIMIT 1;" | tr -d ' ')

echo "Using Project ID: $PROJECT_ID"
echo ""

# Create test documents for different categories
PGPASSWORD=Dell5100 psql -h localhost -U pgadmin -d bsaidb << EOF
-- Insert test documents for various categories
INSERT INTO documents (id, project_id, category_id, filename, original_filename, file_path, file_size, mime_type, status, uploaded_by, created_at, updated_at)
VALUES
-- Fire Safety documents
(gen_random_uuid(), '$PROJECT_ID', 
 (SELECT id FROM document_categories WHERE name = 'Fire Safety'), 
 'fire_safety_strategy_2024.pdf', 
 'Fire Safety Strategy 2024.pdf', 
 '/storage/test/fire_safety_strategy_2024.pdf', 
 1048576, 
 'application/pdf', 
 'uploaded', 
 (SELECT id FROM users LIMIT 1), 
 NOW(), 
 NOW()),

-- Structural Design documents
(gen_random_uuid(), '$PROJECT_ID', 
 (SELECT id FROM document_categories WHERE name = 'Structural Design'), 
 'structural_calculations_v2.pdf', 
 'Structural Calculations v2.pdf', 
 '/storage/test/structural_calculations_v2.pdf', 
 2097152, 
 'application/pdf', 
 'uploaded', 
 (SELECT id FROM users LIMIT 1), 
 NOW(), 
 NOW()),

-- Building Regulations documents
(gen_random_uuid(), '$PROJECT_ID', 
 (SELECT id FROM document_categories WHERE name = 'Building Regulations'), 
 'building_regs_compliance_report.pdf', 
 'Building Regulations Compliance Report.pdf', 
 '/storage/test/building_regs_compliance_report.pdf', 
 524288, 
 'application/pdf', 
 'uploaded', 
 (SELECT id FROM users LIMIT 1), 
 NOW(), 
 NOW()),

-- Construction Control Plan
(gen_random_uuid(), '$PROJECT_ID', 
 (SELECT id FROM document_categories WHERE name = 'Construction Control Plan'), 
 'construction_control_plan_phase1.pdf', 
 'Construction Control Plan - Phase 1.pdf', 
 '/storage/test/construction_control_plan_phase1.pdf', 
 1572864, 
 'application/pdf', 
 'uploaded', 
 (SELECT id FROM users LIMIT 1), 
 NOW(), 
 NOW()),

-- Emergency Systems
(gen_random_uuid(), '$PROJECT_ID', 
 (SELECT id FROM document_categories WHERE name = 'Emergency Systems'), 
 'emergency_evacuation_procedures.pdf', 
 'Emergency Evacuation Procedures.pdf', 
 '/storage/test/emergency_evacuation_procedures.pdf', 
 786432, 
 'application/pdf', 
 'uploaded', 
 (SELECT id FROM users LIMIT 1), 
 NOW(), 
 NOW());

-- Show the results
\echo ''
\echo 'Documents by Category after seeding:'
\echo '===================================='
SELECT 
    dc.name as category_name,
    COUNT(d.id) as document_count
FROM documents d
LEFT JOIN document_categories dc ON d.category_id = dc.id
GROUP BY dc.name
ORDER BY document_count DESC;

\echo ''
\echo 'All documents with categories:'
\echo '=============================='
SELECT 
    d.original_filename,
    dc.name as category_name,
    p.name as project_name
FROM documents d
LEFT JOIN document_categories dc ON d.category_id = dc.id
LEFT JOIN projects p ON d.project_id = p.id
ORDER BY dc.name, d.original_filename;
EOF

echo ""
echo "Done! Test documents have been created with proper categories."