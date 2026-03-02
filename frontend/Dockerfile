FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source and build
COPY . .
RUN npm run build

EXPOSE ${PORT:-3000}

# Start production server
CMD ["npm", "start"]
