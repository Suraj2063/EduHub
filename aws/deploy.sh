#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=========================================================="
echo "🚀 Starting Automated Deployment: $(date)"
echo "=========================================================="

# Define project root directory (defaults to current dir or script parent dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"
echo "📂 Working directory: $(pwd)"

# Check available disk space (Target: 20GB storage on t3.medium)
echo "📊 Current Disk Space:"
df -h /

# 1. Fetch and pull latest changes from GitHub main branch
echo "📥 Pulling latest changes from Git..."
git fetch origin main
git reset --hard origin/main

# 2. Check for optional .env file; notify if missing
if [ ! -f .env ]; then
  echo "ℹ️  No root .env file found. Using default environment variables in docker-compose.yml."
fi

# 3. Pull latest base images (e.g., mongo:7.0, node:20-alpine, nginx:alpine)
echo "📦 Pulling updated base container images..."
docker compose pull mongo || true

# 4. Build custom images and start containers in detached mode
echo "🔨 Building images and recreating containers..."
docker compose up -d --build --remove-orphans

# 5. Clean up dangling and unused images to preserve EC2 disk space
echo "🧹 Pruning unused Docker images and build caches..."
docker image prune -f

# 6. Check container health status
echo "🔍 Checking container status..."
docker compose ps

echo "=========================================================="
echo "✅ Deployment completed successfully!"
echo "🌐 Application is live on port 80."
echo "=========================================================="
