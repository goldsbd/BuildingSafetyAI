#!/bin/bash

# BuildingSafetyAI Application Stop Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo ""
echo "Stopping BuildingSafetyAI services..."
echo ""

# Check if PID file exists
if [ -f ".pids" ]; then
    source .pids
    
    # Kill backend
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        print_status "Backend stopped (PID: $BACKEND_PID)"
    else
        print_warning "Backend process not found"
    fi
    
    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        print_status "Frontend stopped (PID: $FRONTEND_PID)"
    else
        print_warning "Frontend process not found"
    fi
    
    rm -f .pids
else
    print_warning "PID file not found. Attempting to find and kill processes..."
    
    # Try to kill by port
    if lsof -ti:3001 >/dev/null 2>&1; then
        lsof -ti:3001 | xargs kill -9 2>/dev/null
        print_status "Killed process on port 3001 (Backend)"
    fi
    
    if lsof -ti:8080 >/dev/null 2>&1; then
        lsof -ti:8080 | xargs kill -9 2>/dev/null
        print_status "Killed process on port 8080 (Frontend)"
    fi
fi

echo ""
print_status "All services stopped"
echo ""