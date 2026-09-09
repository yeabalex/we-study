#!/bin/bash
# WeStudy Docker Container Starter (MongoDB + Redis)

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo "⚠️  Docker daemon is not running."
    echo "🚀 Attempting to start Docker Desktop app..."
    open -a Docker 2>/dev/null || open -a "Docker Desktop" 2>/dev/null

    echo "⏳ Waiting for Docker daemon to become ready (up to 20s)..."
    for i in {1..20}; do
        if docker info >/dev/null 2>&1; then
            echo "✓ Docker is ready!"
            break
        fi
        sleep 1
    done
fi

if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon is still not reachable."
    echo "👉 Please make sure Docker Desktop is open and running."
    exit 1
fi

echo "🐳 Starting WeStudy MongoDB and Redis containers..."

# 1. MongoDB
if [ "$(docker ps -q -f name=we-study-mongodb)" ]; then
    echo "✓ MongoDB container is already running."
elif [ "$(docker ps -aq -f name=we-study-mongodb)" ]; then
    echo "Starting existing MongoDB container..."
    docker start we-study-mongodb
else
    echo "Pulling & launching MongoDB container..."
    docker run -d --name we-study-mongodb -p 27017:27017 -v mongo_data:/data/db mongo:7.0
fi

# 2. Redis
if [ "$(docker ps -q -f name=we-study-redis)" ]; then
    echo "✓ Redis container is already running."
elif [ "$(docker ps -aq -f name=we-study-redis)" ]; then
    echo "Starting existing Redis container..."
    docker start we-study-redis
else
    echo "Pulling & launching Redis container..."
    docker run -d --name we-study-redis -p 6379:6379 -v redis_data:/data redis:7-alpine redis-server --appendonly yes
fi

# Verify containers are running
sleep 2
MONGO_UP=$(docker ps -q -f name=we-study-mongodb)
REDIS_UP=$(docker ps -q -f name=we-study-redis)

if [ -n "$MONGO_UP" ] && [ -n "$REDIS_UP" ]; then
    echo "✅ MongoDB is running on port 27017"
    echo "✅ Redis is running on port 6379"
else
    echo "⚠️  One or more containers failed to start. Running status check:"
    docker ps -a --filter "name=we-study"
fi
