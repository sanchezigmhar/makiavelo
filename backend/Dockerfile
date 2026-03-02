# ---- Build Stage ----
FROM node:20-alpine AS builder

# Install native compilation tools (for bcrypt) and OpenSSL (for Prisma)
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Install ALL dependencies (including devDependencies for nest build)
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build && ls -la dist/src/main.js

# ---- Production Stage ----
FROM node:20-alpine

# Install OpenSSL (required by Prisma at runtime)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled app from builder
COPY --from=builder /app/dist ./dist

EXPOSE ${PORT:-4001}

# Run migrations on startup, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
