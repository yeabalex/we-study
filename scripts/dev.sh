#!/bin/bash
# One-Command All-in-One Dev Starter for WeStudy

echo "======================================================"
echo "🚀 [WeStudy] Starting Fullstack Environment..."
echo "======================================================"

# 1. Start MongoDB & Redis via Docker
./scripts/docker_run.sh

echo "======================================================"
echo "🌐 Starting Next.js Dev Server (http://localhost:3000)..."
echo "======================================================"

# 2. Launch Next.js dev server
exec next dev
