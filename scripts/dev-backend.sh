#!/bin/bash

# Development helper script for running the backend

set -e

echo "Starting BuildingSafetyAI backend development server..."

# Navigate to backend directory
cd backend

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    echo "Cargo is not installed. Please install Rust first."
    exit 1
fi

# Set environment variables
export DATABASE_URL="postgresql://pgadmin:Dell5100@localhost/bsaidb"
export JWT_SECRET="dev-secret-key-change-in-production"
export RUST_LOG="info,actix_web=debug"
export RUST_BACKTRACE=1

# Run the backend with hot reloading
cargo watch -x run