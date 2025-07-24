#!/bin/bash

# Quick test of document processing
echo "Quick Document Processing Test"

# API base URL
API_URL="http://localhost:3001/api"

# Test credentials
EMAIL="admin@bsai.com"
PASSWORD="admin123!"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}Login failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Logged in${NC}"

# Get first document
echo "Getting documents..."
DOCS_RESPONSE=$(curl -s -X GET "$API_URL/documents" \
    -H "Authorization: Bearer $TOKEN")

DOCUMENT_ID=$(echo $DOCS_RESPONSE | jq -r '.[0].id')
DOCUMENT_NAME=$(echo $DOCS_RESPONSE | jq -r '.[0].original_filename')

if [ "$DOCUMENT_ID" = "null" ] || [ -z "$DOCUMENT_ID" ]; then
    echo -e "${RED}No documents found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found document: $DOCUMENT_NAME${NC}"

# Create assessment
echo "Creating assessment..."
ASSESSMENT_RESPONSE=$(curl -s -X POST "$API_URL/assessments" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"document_id\": \"$DOCUMENT_ID\", \"assessment_type\": \"ai\"}")

ASSESSMENT_ID=$(echo $ASSESSMENT_RESPONSE | jq -r '.id')

if [ "$ASSESSMENT_ID" = "null" ] || [ -z "$ASSESSMENT_ID" ]; then
    echo -e "${RED}Failed to create assessment${NC}"
    echo "Response: $ASSESSMENT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Assessment created: $ASSESSMENT_ID${NC}"

# Trigger AI analysis
echo "Starting AI analysis (this may take 1-2 minutes)..."
ANALYZE_RESPONSE=$(curl -s -X POST "$API_URL/assessments/$ASSESSMENT_ID/analyze" \
    -H "Authorization: Bearer $TOKEN")

echo "AI Response: $ANALYZE_RESPONSE"

# Check assessment status
echo "Checking assessment status..."
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/assessments/$ASSESSMENT_ID" \
    -H "Authorization: Bearer $TOKEN")

STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
echo -e "${GREEN}Assessment status: $STATUS${NC}"

# Get report
echo "Getting assessment report..."
REPORT_RESPONSE=$(curl -s -X GET "$API_URL/assessments/$ASSESSMENT_ID/report" \
    -H "Authorization: Bearer $TOKEN")

RESPONSE_COUNT=$(echo $REPORT_RESPONSE | jq '.responses | length' 2>/dev/null || echo "0")
echo -e "${GREEN}✓ Report contains $RESPONSE_COUNT responses${NC}"

if [ "$RESPONSE_COUNT" -gt 0 ]; then
    echo -e "\n${GREEN}Sample verdicts:${NC}"
    echo $REPORT_RESPONSE | jq -r '.responses[:5][] | "- \(.question.ref): \(.verdict)"'
fi