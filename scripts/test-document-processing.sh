#!/bin/bash

# Test document processing flow
echo "Testing document processing flow..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
API_URL="http://localhost:3001/api"

# Test credentials
EMAIL="admin@bsai.com"
PASSWORD="admin123!"

# Function to check if services are running
check_services() {
    echo -e "${YELLOW}Checking services...${NC}"
    
    # Check frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200\|302"; then
        echo -e "${GREEN}✓ Frontend is running${NC}"
    else
        echo -e "${RED}✗ Frontend is not running${NC}"
        echo "Please run ./runapp.sh first"
        exit 1
    fi
    
    # Check backend
    if curl -s -o /dev/null -w "%{http_code}" $API_URL/health | grep -q "200"; then
        echo -e "${GREEN}✓ Backend is running${NC}"
    else
        echo -e "${RED}✗ Backend is not running${NC}"
        echo "Please run ./runapp.sh first"
        exit 1
    fi
}

# Function to login and get token
login() {
    echo -e "\n${YELLOW}Logging in...${NC}"
    
    RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
    
    TOKEN=$(echo $RESPONSE | jq -r '.access_token')
    
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        echo -e "${GREEN}✓ Login successful${NC}"
        return 0
    else
        echo -e "${RED}✗ Login failed${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Function to get first document
get_first_document() {
    echo -e "\n${YELLOW}Getting first document...${NC}"
    
    # Get all documents
    RESPONSE=$(curl -s -X GET "$API_URL/documents" \
        -H "Authorization: Bearer $TOKEN")
    
    DOCUMENT_ID=$(echo $RESPONSE | jq -r '.[0].id')
    DOCUMENT_NAME=$(echo $RESPONSE | jq -r '.[0].original_filename')
    
    if [ "$DOCUMENT_ID" != "null" ] && [ -n "$DOCUMENT_ID" ]; then
        echo -e "${GREEN}✓ Found document: $DOCUMENT_NAME (ID: $DOCUMENT_ID)${NC}"
        return 0
    else
        echo -e "${RED}✗ No documents found${NC}"
        echo "Please upload a document first"
        exit 1
    fi
}

# Function to create assessment
create_assessment() {
    echo -e "\n${YELLOW}Creating AI assessment...${NC}"
    
    RESPONSE=$(curl -s -X POST "$API_URL/assessments" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"document_id\": \"$DOCUMENT_ID\", \"assessment_type\": \"ai\"}")
    
    ASSESSMENT_ID=$(echo $RESPONSE | jq -r '.id')
    
    if [ "$ASSESSMENT_ID" != "null" ] && [ -n "$ASSESSMENT_ID" ]; then
        echo -e "${GREEN}✓ Assessment created (ID: $ASSESSMENT_ID)${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to create assessment${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Function to trigger AI analysis
analyze_document() {
    echo -e "\n${YELLOW}Triggering AI analysis...${NC}"
    echo "This may take a few minutes..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/assessments/$ASSESSMENT_ID/analyze" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo $RESPONSE | jq -e '.message' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ AI analysis completed${NC}"
        return 0
    else
        echo -e "${RED}✗ AI analysis failed${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Function to get assessment report
get_report() {
    echo -e "\n${YELLOW}Getting assessment report...${NC}"
    
    RESPONSE=$(curl -s -X GET "$API_URL/assessments/$ASSESSMENT_ID/report" \
        -H "Authorization: Bearer $TOKEN")
    
    # Check if we got a valid report
    if echo $RESPONSE | jq -e '.responses' > /dev/null 2>&1; then
        TOTAL_RESPONSES=$(echo $RESPONSE | jq '.responses | length')
        SATISFACTORY=$(echo $RESPONSE | jq '[.responses[] | select(.verdict == "satisfactory")] | length')
        UNSATISFACTORY=$(echo $RESPONSE | jq '[.responses[] | select(.verdict == "unsatisfactory")] | length')
        REQUIREMENT=$(echo $RESPONSE | jq '[.responses[] | select(.verdict == "requirement")] | length')
        
        echo -e "${GREEN}✓ Report retrieved successfully${NC}"
        echo -e "\n${YELLOW}Assessment Results:${NC}"
        echo "Total Questions: $TOTAL_RESPONSES"
        echo "Satisfactory: $SATISFACTORY"
        echo "Unsatisfactory: $UNSATISFACTORY"
        echo "Requirements: $REQUIREMENT"
        
        # Show first few responses
        echo -e "\n${YELLOW}Sample Responses:${NC}"
        echo $RESPONSE | jq -r '.responses[:3][] | "- \(.question.ref): \(.verdict) - \(.comment | .[0:100])..."'
        
        return 0
    else
        echo -e "${RED}✗ Failed to get report${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Main execution
echo -e "${GREEN}=== Document Processing Test ===${NC}"

check_services
login
get_first_document
create_assessment
analyze_document
get_report

echo -e "\n${GREEN}✓ Document processing test completed successfully!${NC}"
echo -e "${YELLOW}You can now view the results in the web interface:${NC}"
echo "1. Go to http://localhost:8080"
echo "2. Navigate to the Document Library"
echo "3. Click 'Review' on the processed document"