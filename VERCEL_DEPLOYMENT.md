# Simple Vercel Deployment Guide

This guide will help you deploy both frontend and backend on Vercel using Next.js API routes, Vercel Postgres, and no Redis.

## Overview

- **Frontend**: Next.js (already on Vercel)
- **Backend**: Next.js API Routes (in `/app/api` folder)
- **Database**: Vercel Postgres (serverless, built-in)
- **No Redis**: Removed queue/cache dependencies
- **No WebSocket**: Use polling for real-time updates

## Step 1: Set Up Vercel Postgres

1. Go to your Vercel project dashboard
2. Click on **Storage** tab
3. Click **Create Database** → **Postgres**
4. Copy the connection string (you'll need this)

## Step 2: Update Environment Variables in Vercel

Go to **Settings** → **Environment Variables** and add:

```env
# Database (from Vercel Postgres)
DATABASE_URL=postgresql://...

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Encryption Key (exactly 32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key

# n8n Integration (optional)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_WEBHOOK_SECRET=your-webhook-secret
```

**Generate secrets:**
```bash
# JWT_SECRET (32+ chars)
openssl rand -base64 32

# ENCRYPTION_KEY (exactly 32 chars)
openssl rand -hex 16
```

## Step 3: Move Prisma to Frontend

Since we're using Next.js API routes, Prisma should be in the frontend directory:

1. Copy `backend/prisma` to `frontend/prisma`
2. Update `frontend/package.json` to include Prisma dependencies

## Step 4: Create Next.js API Routes

Create API routes in `frontend/app/api/`:
- `/api/auth/register/route.ts`
- `/api/auth/login/route.ts`
- `/api/auth/me/route.ts`
- `/api/campaigns/route.ts`
- `/api/campaigns/upload/route.ts`
- `/api/campaigns/[id]/route.ts`
- `/api/leads/route.ts`
- `/api/analytics/route.ts`

## Step 5: Remove Redis Dependencies

- Remove BullMQ queue processing
- Use direct database operations instead
- Remove WebSocket, use polling for updates

## Step 6: Deploy

1. Push code to GitHub
2. Vercel will automatically deploy
3. Run migrations: `npx prisma migrate deploy` (or use Vercel's postinstall script)

## Benefits

✅ Single deployment (frontend + backend)
✅ No separate services to manage
✅ Serverless scaling
✅ Built-in database (Vercel Postgres)
✅ Automatic HTTPS
✅ Simple and cost-effective

## Limitations

⚠️ No WebSocket support (use polling instead)
⚠️ No background job queue (process synchronously)
⚠️ Function timeout limits (10s on Hobby, 60s on Pro)

