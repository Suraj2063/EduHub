# ==========================================
# Stage 1: Build Frontend React / Vite App
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package manifests first for caching
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy source files
COPY . .

# Build production bundle (generates /app/dist)
RUN npm run build

# ==========================================
# Stage 2: Serve with Nginx Alpine
# ==========================================
FROM nginx:alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Write Nginx configuration directly inside the container
RUN cat <<'EOF' > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    # Root directory containing built React files
    root /usr/share/nginx/html;
    index index.html index.htm;

    # Gzip Compression for fast delivery
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
    gzip_disable "MSIE [1-6]\.";

    # Reverse proxy API requests to backend container
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Proxy uploaded static files (PDFs, images) to backend container
    location /uploads/ {
        proxy_pass http://backend:8000/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Handle React Router (SPA) - Return index.html for unknown routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets (images, fonts, css, js)
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {
        expires 6M;
        access_log off;
        add_header Cache-Control "public, max-age=15552000, immutable";
    }

    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# Expose HTTP port 80
EXPOSE 80

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
