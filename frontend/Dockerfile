# ─── Frontend Dockerfile ────────────────────────────────────────────────────────
# Stage 1: Build React app
# Stage 2: Serve with Nginx

# ── Build Stage ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build args for environment variables
ARG REACT_APP_API_URL=/api
ARG REACT_APP_SOCKET_URL=
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY public ./public
COPY src ./src
RUN npm run build

# ── Serve Stage ───────────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Nginx config for React SPA (handles client-side routing)
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
