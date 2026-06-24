# ─── Backend Dockerfile ─────────────────────────────────────────────────────────
# Multi-stage build for production-ready Node.js backend

FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY src ./src

# Create uploads directory
RUN mkdir -p uploads

# ─── Runtime Stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app

# Copy from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/src ./src
COPY --from=base /app/uploads ./uploads
COPY package*.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

# Run Prisma migrations then start server
CMD ["sh", "-c", "npx prisma db push && node src/server.js"]
