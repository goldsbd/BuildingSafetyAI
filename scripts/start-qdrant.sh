#!/bin/bash

# Check if Qdrant is running
if ! curl -s http://localhost:6333/health > /dev/null 2>&1
then
    echo "Starting Qdrant server..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null
    then
        echo "Docker is not installed. Please install Docker first:"
        echo "  macOS: brew install --cask docker"
        echo "  Ubuntu: sudo apt-get install docker.io"
        echo "  Or download from https://www.docker.com/"
        exit 1
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        echo "docker-compose.yml not found. Creating minimal Qdrant setup..."
        # Create minimal docker-compose for Qdrant only
        cat > docker-compose.qdrant.yml << EOF
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant:v1.7.4
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  qdrant_storage:
EOF
        echo "Using docker-compose.qdrant.yml for Qdrant startup"
        COMPOSE_FILE="docker-compose.qdrant.yml"
    else
        echo "Using existing docker-compose.yml"
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    # Start Qdrant with Docker Compose
    if command -v docker-compose &> /dev/null
    then
        docker-compose -f $COMPOSE_FILE up -d qdrant
    elif docker compose version &> /dev/null 2>&1
    then
        docker compose -f $COMPOSE_FILE up -d qdrant
    else
        echo "Docker Compose not found. Starting Qdrant directly with Docker..."
        docker run -d \
            --name qdrant \
            -p 6333:6333 \
            -p 6334:6334 \
            -v qdrant_storage:/qdrant/storage \
            -e QDRANT__SERVICE__HTTP_PORT=6333 \
            -e QDRANT__SERVICE__GRPC_PORT=6334 \
            qdrant/qdrant:v1.7.4
    fi
    
    # Wait for Qdrant to be ready
    echo "Waiting for Qdrant to start..."
    for i in {1..30}; do
        if curl -s http://localhost:6333/health > /dev/null 2>&1; then
            echo "Qdrant started successfully"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo "Warning: Qdrant took longer than expected to start"
        fi
    done
else
    echo "Qdrant is already running"
fi

# Test Qdrant connection
if curl -s http://localhost:6333/health > /dev/null 2>&1; then
    echo "Qdrant is accessible at http://localhost:6333"
    echo "Qdrant Web UI available at http://localhost:6333/dashboard"
else
    echo "Warning: Qdrant is not accessible"
    exit 1
fi