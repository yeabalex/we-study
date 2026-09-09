#!/bin/bash
# One-Command Production Starter for WeStudy (MongoDB + Redis + Next.js Production Server)

echo "======================================================"
echo "🚀 [WeStudy] Starting Production Stack..."
echo "======================================================"

# 1. Start MongoDB & Redis via Docker
./scripts/docker_run.sh

# 2. Build if .next folder does not exist
if [ ! -d ".next" ]; then
    echo "📦 Building Next.js production bundle..."
    next build
fi

echo "======================================================"
echo "🌐 Starting Next.js Production Server (http://localhost:3000)..."
echo "======================================================"

# 3. Launch Next.js production server
exec next start
