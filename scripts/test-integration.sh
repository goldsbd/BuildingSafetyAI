#!/bin/bash

# Test BuildingSafetyAI Frontend-Backend Integration

echo "Testing BuildingSafetyAI Integration..."
echo ""

# Check if backend is running
echo "1. Checking backend status..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/auth/login | grep -q "405"; then
    echo "✓ Backend is running on port 3001"
else
    echo "✗ Backend is not running. Please start it with: cd backend && cargo run"
    echo "  Attempting to start backend..."
    cd ../backend && cargo run &
    BACKEND_PID=$!
    sleep 5
fi

echo ""

# Check if frontend is running
echo "2. Checking frontend status..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
    echo "✓ Frontend is running on port 8080"
else
    echo "✗ Frontend is not running. Starting frontend..."
    npm run dev &
    FRONTEND_PID=$!
    sleep 3
fi

echo ""
echo "3. Integration test complete!"
echo ""
echo "You can now:"
echo "  - Open http://localhost:8080 in your browser"
echo "  - Login with: admin@bsai.com / admin123!"
echo ""
echo "Backend API: http://localhost:3001/api"
echo "Frontend: http://localhost:8080"