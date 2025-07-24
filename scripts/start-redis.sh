#!/bin/bash

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null
then
    echo "Starting Redis server..."
    # Try to start Redis in the background
    if command -v redis-server &> /dev/null
    then
        redis-server --daemonize yes
        echo "Redis started successfully"
    else
        echo "Redis is not installed. Please install Redis first:"
        echo "  macOS: brew install redis"
        echo "  Ubuntu: sudo apt-get install redis-server"
        echo "  CentOS: sudo yum install redis"
        exit 1
    fi
else
    echo "Redis is already running"
fi

# Test Redis connection
if command -v redis-cli &> /dev/null
then
    redis-cli ping > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Redis is accessible at localhost:6379"
    else
        echo "Warning: Redis is running but not accessible"
    fi
fi