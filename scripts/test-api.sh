#!/bin/bash

# Test BuildingSafetyAI API endpoints

BASE_URL="http://127.0.0.1:3001/api"

echo "Testing BuildingSafetyAI API..."
echo ""

# Test login
echo "1. Testing login endpoint..."
RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bsai.com", "password": "admin123!"}')

if [[ $RESPONSE == *"token"* ]]; then
    echo "✓ Login successful"
    TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    echo "Token received: ${TOKEN:0:20}..."
else
    echo "✗ Login failed"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""

# Test get current user
echo "2. Testing get current user endpoint..."
USER_RESPONSE=$(curl -s -X GET $BASE_URL/auth/me \
  -H "Authorization: Bearer $TOKEN")

if [[ $USER_RESPONSE == *"email"* ]]; then
    echo "✓ Get current user successful"
    echo "User: $USER_RESPONSE"
else
    echo "✗ Get current user failed"
    echo "Response: $USER_RESPONSE"
fi

echo ""

# Test companies endpoint (admin only)
echo "3. Testing companies list endpoint..."
COMPANIES_RESPONSE=$(curl -s -X GET $BASE_URL/companies \
  -H "Authorization: Bearer $TOKEN")

if [[ $COMPANIES_RESPONSE == *"["* ]]; then
    echo "✓ Companies list successful"
else
    echo "✗ Companies list failed"
    echo "Response: $COMPANIES_RESPONSE"
fi

echo ""
echo "API tests completed!"