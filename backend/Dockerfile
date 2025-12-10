# Build stage
FROM node:20-alpine AS builder

# Install OpenSSL and required libraries for Prisma
RUN apk add --no-cache openssl1.1-compat libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL and required libraries for Prisma
RUN apk add --no-cache openssl1.1-compat libc6-compat

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies (this will skip postinstall since prisma isn't installed yet)
RUN npm ci --only=production --ignore-scripts

# Install prisma CLI (needed for migrations)
RUN npm install --no-save prisma@^5.19.1 && npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application - run migrations then start server
CMD sh -c "npx prisma migrate deploy && node dist/main.js"

