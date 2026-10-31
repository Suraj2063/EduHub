# Node.js LTS Alpine image
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies needed for PDF extraction & OCR (pdftoppm)
RUN apk add --no-cache poppler-utils

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Create necessary upload and cache directories with proper permissions
RUN mkdir -p uploads audio_cache video_cache temp && chown -R node:node /app

# Use non-root node user for security
USER node

# Expose backend application port
EXPOSE 8000

# Environment defaults
ENV PORT=8000
ENV NODE_ENV=production

# Start backend server
CMD ["node", "index.js"]
