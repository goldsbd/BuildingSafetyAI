#!/bin/bash

# Script to seed BSR HRB assessment questions into the database

set -e

# Database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-bsaidb}"
DB_USER="${DB_USER:-pgadmin}"
DB_PASSWORD="${DB_PASSWORD:-Dell5100}"

export PGPASSWORD=$DB_PASSWORD

echo "Seeding BSR HRB assessment questions..."

# Create temporary SQL file
TEMP_SQL=$(mktemp)

# Read the JSON file and generate SQL
cat > $TEMP_SQL << 'EOF'
-- Clear existing data
TRUNCATE TABLE assessment_sections CASCADE;

-- Insert main assessment
INSERT INTO assessment_sections (section_id, section_title, assessment_title, assessment_description)
VALUES ('main', 'Main Assessment', 'Building Safety Regulator - Higher Risk Building Assessment Questions', 
'Comprehensive assessment criteria for Building Control Approval Applications for work in Higher Risk Buildings under The Building (Higher-Risk Buildings Procedures) (England) Regulations 2023');

EOF

# Parse JSON and generate SQL for sections, subsections, and questions
python3 << 'PYTHON_EOF' >> $TEMP_SQL
import json

with open('/Users/gold/Code/BuildingSafetyAI/Questions/bsr-hrb-assessment-questions.json', 'r') as f:
    data = json.load(f)

# Generate SQL for each section
for section in data['sections']:
    section_id = section['section_id']
    section_title = section['section_title'].replace("'", "''")
    
    print(f"\n-- Section: {section_title}")
    print(f"INSERT INTO assessment_sections (section_id, section_title) VALUES ('{section_id}', '{section_title}');")
    
    # Generate SQL for subsections and questions
    for subsection in section.get('subsections', []):
        sub_id = subsection['id']
        sub_title = subsection['title'].replace("'", "''")
        sub_desc = subsection.get('description', '').replace("'", "''") if subsection.get('description') else 'NULL'
        
        print(f"\n-- Subsection: {sub_title}")
        if sub_desc != 'NULL':
            print(f"INSERT INTO assessment_subsections (section_id, subsection_id, title, description)")
            print(f"SELECT id, '{sub_id}', '{sub_title}', '{sub_desc}'")
            print(f"FROM assessment_sections WHERE section_id = '{section_id}';")
        else:
            print(f"INSERT INTO assessment_subsections (section_id, subsection_id, title)")
            print(f"SELECT id, '{sub_id}', '{sub_title}'")
            print(f"FROM assessment_sections WHERE section_id = '{section_id}';")
        
        # Insert questions
        for question in subsection.get('questions', []):
            ref = question['ref'].replace("'", "''")
            original = question['original'].replace("'", "''")
            improved = question['improved'].replace("'", "''")
            
            print(f"\nINSERT INTO assessment_questions (subsection_id, ref, original_text, improved_text)")
            print(f"SELECT id, '{ref}', '{original}', '{improved}'")
            print(f"FROM assessment_subsections WHERE subsection_id = '{sub_id}';")
PYTHON_EOF

# Execute the SQL
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $TEMP_SQL

# Clean up
rm -f $TEMP_SQL

echo "Assessment questions seeded successfully!"

# Display count
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) as question_count FROM assessment_questions;" | xargs echo "Total questions loaded:"