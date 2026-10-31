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

# 4. Ensure docker-buildx plugin (>= 0.17.0) is installed for docker compose build
NEED_BUILDX=false
if ! docker buildx version >/dev/null 2>&1; then
  NEED_BUILDX=true
else
  BUILDX_VER=$(docker buildx version 2>/dev/null | grep -oE "v[0-9]+\.[0-9]+" | head -n1 | tr -d "v")
  MAJOR=$(echo "$BUILDX_VER" | cut -d. -f1)
  MINOR=$(echo "$BUILDX_VER" | cut -d. -f2)
  if [ "${MAJOR:-0}" -eq 0 ] && [ "${MINOR:-0}" -lt 17 ]; then
    NEED_BUILDX=true
  fi
fi

if [ "$NEED_BUILDX" = true ]; then
  echo "📦 Installing docker-buildx plugin..."
  mkdir -p "$HOME/.docker/cli-plugins"
  BUILDX_TAG=$(curl -sI https://github.com/docker/buildx/releases/latest | grep -i "location:" | sed -e 's|.*/tag/||' | tr -d '\r\n')
  BUILDX_TAG="${BUILDX_TAG:-v0.38.1}"
  curl -SL "https://github.com/docker/buildx/releases/download/${BUILDX_TAG}/buildx-${BUILDX_TAG}.linux-amd64" \
    -o "$HOME/.docker/cli-plugins/docker-buildx"
  chmod +x "$HOME/.docker/cli-plugins/docker-buildx"
  echo "✅ Installed docker-buildx successfully."
fi

# 5. Build custom images and start containers in detached mode
echo "🔨 Building images and recreating containers..."
docker compose up -d --build --remove-orphans

# 6. Clean up dangling and unused images to preserve EC2 disk space
echo "🧹 Pruning unused Docker images and build caches..."
docker image prune -f

# 7. Check container health status
echo "🔍 Checking container status..."
docker compose ps

echo "=========================================================="
echo "✅ Deployment completed successfully!"
echo "🌐 Application is live on port 80."
echo "=========================================================="
