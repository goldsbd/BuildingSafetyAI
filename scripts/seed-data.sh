#!/bin/bash

# BuildingSafetyAI Seed Data Script
# This script seeds the database with initial test data

set -e

echo "Seeding BuildingSafetyAI database with test data..."

# Database connection parameters
DB_HOST="localhost"
DB_USER="pgadmin"
DB_PASSWORD="Dell5100"
DB_NAME="bsaidb"

# Export password to avoid prompts
export PGPASSWORD=$DB_PASSWORD

# Seed initial data
psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
-- Insert default admin user
-- Password: admin123! (will be hashed by the application)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active)
VALUES (
    gen_random_uuid(),
    'admin@bsai.com',
    crypt('admin123!', gen_salt('bf')),
    'Admin',
    'User',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert test company
INSERT INTO companies (id, name, registration_number, contact_email, subscription_tier)
VALUES (
    gen_random_uuid(),
    'Test Construction Ltd',
    '12345678',
    'contact@testconstruction.com',
    'standard'
) ON CONFLICT DO NOTHING;

-- Get the company ID for further inserts
DO \$\$
DECLARE
    v_company_id UUID;
    v_user_id UUID;
BEGIN
    SELECT id INTO v_company_id FROM companies WHERE registration_number = '12345678' LIMIT 1;
    SELECT id INTO v_user_id FROM users WHERE email = 'admin@bsai.com' LIMIT 1;
    
    -- Update admin user with company
    UPDATE users SET company_id = v_company_id WHERE id = v_user_id;
    
    -- Insert test project
    INSERT INTO projects (id, company_id, name, project_reference, building_type, location, status)
    VALUES (
        gen_random_uuid(),
        v_company_id,
        'City Tower Development',
        'PRJ-2024-001',
        'commercial',
        'London, UK',
        'active'
    ) ON CONFLICT DO NOTHING;
END\$\$;

-- Insert document categories from specification
INSERT INTO document_categories (id, name, code, description)
VALUES 
    (gen_random_uuid(), 'Fire Safety', 'FS', 'Fire safety related documents'),
    (gen_random_uuid(), 'Structural Design', 'SD', 'Structural design and calculations'),
    (gen_random_uuid(), 'Accessibility', 'ACC', 'Accessibility compliance documents'),
    (gen_random_uuid(), 'Environmental', 'ENV', 'Environmental impact assessments'),
    (gen_random_uuid(), 'Building Control', 'BC', 'Building control submissions')
ON CONFLICT DO NOTHING;

EOF

echo "Database seeding completed successfully!"

# Unset password
unset PGPASSWORD