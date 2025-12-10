#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting CRM Backend..."

# Generate Prisma client (required before starting)
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "✅ Starting NestJS application..."
exec npm run start:prod

