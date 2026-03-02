FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

EXPOSE ${PORT:-4001}

# Run migrations on startup, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
