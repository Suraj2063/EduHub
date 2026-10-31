# Node.js 20 LTS Slim (Debian Bookworm - full glibc support for Piper & native AI tools)
FROM node:20-bookworm-slim

WORKDIR /app

# Install system dependencies needed for PDF extraction & Piper binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    curl \
    ca-certificates \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Install official Piper binary
RUN mkdir -p /opt/piper && \
    curl -SL https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz | tar -xz -C /opt/piper --strip-components=1 && \
    ln -s /opt/piper/piper /usr/local/bin/piper

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Ensure Piper voice model is present in the image
RUN mkdir -p piper_models && \
    curl -SL "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx" -o piper_models/en_US-lessac-medium.onnx && \
    curl -SL "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" -o piper_models/en_US-lessac-medium.onnx.json

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
ENV PIPER_BIN=/usr/local/bin/piper
ENV PIPER_MODEL=/app/piper_models/en_US-lessac-medium.onnx

# Start backend server
CMD ["node", "index.js"]
