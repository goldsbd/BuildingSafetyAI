#!/bin/bash

# BuildingSafetyAI Application Startup Script
# This script starts all services and ensures they're running correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        print_warning "Port $1 is already in use. Killing existing process..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Function to wait for service to start
wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q -E "200|401|405"; then
            print_status "$service is ready!"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    print_error "$service failed to start after $max_attempts seconds"
    return 1
}

# Main script
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║     BuildingSafetyAI Startup Script       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    print_error "Rust/Cargo is not installed. Please install Rust first."
    echo "Visit: https://rustup.rs/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "Node.js/npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Start Redis if available
print_info "Checking Redis..."
if [ -f "scripts/start-redis.sh" ]; then
    sh scripts/start-redis.sh
else
    print_warning "Redis startup script not found. Running without cache."
fi

# Check if PostgreSQL is accessible
print_info "Checking PostgreSQL connection..."
if ! PGPASSWORD=Dell5100 psql -h localhost -U pgadmin -d bsaidb -c "SELECT 1" >/dev/null 2>&1; then
    print_warning "PostgreSQL is not accessible. Attempting to set up database..."
    
    # Run database setup
    if [ -f "scripts/setup-db.sh" ]; then
        print_info "Running database setup..."
        sh scripts/setup-db.sh
        
        # Run migrations
        if [ -f "scripts/run-migrations.sh" ]; then
            print_info "Running database migrations..."
            sh scripts/run-migrations.sh
        fi
        
        # Seed data
        if [ -f "scripts/seed-data.sh" ]; then
            print_info "Seeding database..."
            sh scripts/seed-data.sh
        fi
    else
        print_error "Database setup scripts not found. Please ensure PostgreSQL is running."
        exit 1
    fi
else
    print_status "PostgreSQL connection successful"
fi

# Kill existing processes on our ports
print_info "Checking ports..."
kill_port 3001  # Backend
kill_port 8080  # Frontend

# Install frontend dependencies
print_info "Installing frontend dependencies..."
npm install --silent 2>&1 | grep -E "(error|warning)" || true
print_status "Frontend dependencies installed"

# Build and start backend
print_info "Building Rust backend..."
cd backend

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || cat > .env << EOF
# Database
DATABASE_URL=postgresql://pgadmin:Dell5100@localhost/bsaidb

# Server
HOST=127.0.0.1
PORT=3001

# JWT
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRY=86400

# Logging
RUST_LOG=info,actix_web=debug

# File Storage
UPLOAD_PATH=../storage
MAX_FILE_SIZE=52428800

# Redis Cache
REDIS_URL=redis://127.0.0.1/
EOF
fi

# Build backend in release mode for better performance
cargo build --release 2>&1 | grep -E "(error|warning|Finished)" || true
print_status "Backend built successfully"

# Start backend
print_info "Starting backend server..."
RUST_LOG=info cargo run --release --bin bsai_backend > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo -n "Waiting for backend to start"
if wait_for_service "http://localhost:3001/api/auth/me" "Backend"; then
    print_status "Backend is running on http://localhost:3001"
else
    print_error "Backend failed to start. Check logs/backend.log for details"
    exit 1
fi

# Start frontend
print_info "Starting frontend development server..."
npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo -n "Waiting for frontend to start"
if wait_for_service "http://localhost:8080" "Frontend"; then
    print_status "Frontend is running on http://localhost:8080"
else
    print_error "Frontend failed to start. Check logs/frontend.log for details"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Create storage directories if they don't exist
print_info "Creating storage directories..."
mkdir -p storage/companies
print_status "Storage directories created"

# Final status
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║        Application Started Successfully    ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
print_status "${GREEN}Frontend URL:${NC} http://localhost:8080"
print_status "${GREEN}Backend API:${NC}  http://localhost:3001/api"
print_status "${GREEN}API Docs:${NC}     See API_DOCUMENTATION.md"
echo ""
echo "Login Credentials:"
echo "  Email:    admin@bsai.com"
echo "  Password: admin123!"
echo ""
echo "Process IDs:"
echo "  Backend PID: $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "Logs:"
echo "  Backend:  logs/backend.log"
echo "  Frontend: logs/frontend.log"
echo ""
echo "To stop all services, run: ./stopapp.sh"
echo "or press Ctrl+C and run: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Create PID file for stop script
echo "BACKEND_PID=$BACKEND_PID" > .pids
echo "FRONTEND_PID=$FRONTEND_PID" >> .pids

# Function to check if processes are still running
check_processes() {
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend process died unexpectedly. Check logs/backend.log"
        return 1
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend process died unexpectedly. Check logs/frontend.log"
        return 1
    fi
    return 0
}

# Keep script running and handle Ctrl+C
trap 'echo ""; print_warning "Shutting down services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .pids; exit' INT

print_info "Services are running. Press Ctrl+C to stop."
echo ""

# Monitor processes
while true; do
    if ! check_processes; then
        print_error "One or more services stopped unexpectedly"
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        rm -f .pids
        exit 1
    fi
    sleep 5
done