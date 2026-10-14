# ============================================================
# SAMS WhatsApp Gateway — Multi-stage Dockerfile
# Stage 1: Build TypeScript
# Stage 2: Production image (non-root, healthcheck)
# ============================================================

# ── Stage 1: Builder ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools needed for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

RUN npm ci --include=dev

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Stage 2: Production image ────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -S sams && adduser -S sams -G sams

# Install runtime tools
RUN apk add --no-cache python3 make g++

# Copy package manifest and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Create data directory with correct ownership
RUN mkdir -p /app/data && chown sams:sams /app/data

# Copy .env.example for reference
COPY .env.example ./

# Switch to non-root user
USER sams

# Expose port
EXPOSE 3001

# Data volume (SQLite database)
VOLUME ["/app/data"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
