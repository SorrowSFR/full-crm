# Complete Vercel Deployment Guide

This application is now fully configured to deploy on Vercel with everything in one place.

## ✅ What's Included

- ✅ **Frontend**: Next.js 16 with App Router
- ✅ **Backend**: Next.js API Routes (in `/app/api`)
- ✅ **Database**: Vercel Postgres (serverless)
- ✅ **No External Services**: No Redis, no separate backend server
- ✅ **Real-time Updates**: Polling instead of WebSocket (works on serverless)

## 🚀 Quick Deploy (5 Minutes)

### Step 1: Create Vercel Postgres Database

1. Go to [vercel.com](https://vercel.com) → Your Project
2. Click **Storage** tab
3. Click **Create Database** → **Postgres**
4. Wait for creation (takes ~30 seconds)
5. The `DATABASE_URL` is automatically added to your environment variables

### Step 2: Add Environment Variables

Go to **Settings** → **Environment Variables** and add:

```env
# Database (auto-added by Vercel Postgres)
DATABASE_URL=postgresql://... ✅ Already set

# JWT Secret (generate: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Encryption Key (generate: openssl rand -hex 16)
ENCRYPTION_KEY=your-32-character-encryption-key

# JWT Expiration (optional)
JWT_EXPIRES_IN=7d

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

### Step 3: Deploy

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push
   ```

2. **In Vercel Dashboard**:
   - Go to **Add New Project**
   - **Import** your GitHub repository
   - **Root Directory**: `frontend` (or leave blank if frontend is root)
   - **Framework**: Next.js (auto-detected)
   - **Build Command**: Already set in `vercel.json`
   - **Environment Variables**: Add from Step 2
   - Click **Deploy**

3. **Wait for deployment** (~2-3 minutes)

4. **Database migrations run automatically** during build (via `vercel.json`)

### Step 4: Verify Deployment

1. Visit your Vercel URL
2. Register a new account
3. Create a campaign
4. Everything should work! 🎉

## 📁 Project Structure

```
frontend/
├── app/
│   ├── api/                    # Backend API routes
│   │   ├── auth/               # Authentication
│   │   ├── campaigns/          # Campaign management
│   │   ├── leads/              # Lead management
│   │   ├── analytics/          # Analytics & exports
│   │   └── webhooks/           # n8n webhooks
│   ├── campaigns/              # Frontend pages
│   ├── login/
│   └── analytics/
├── lib/
│   ├── prisma.ts              # Prisma client
│   ├── jwt.ts                 # JWT utilities
│   ├── auth-utils.ts          # Auth helpers
│   ├── encryption.ts           # Encryption utilities
│   ├── phone-validation.ts     # Phone validation
│   └── hmac.ts                # HMAC verification
├── prisma/
│   └── schema.prisma           # Database schema
└── vercel.json                 # Vercel configuration
```

## 🔧 API Routes

All API routes are in `/app/api/`:

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/me` - Get current user
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns/upload` - Upload Excel file
- `GET /api/campaigns/[id]` - Get campaign
- `GET /api/leads/campaign/[id]` - Get leads by campaign
- `GET /api/leads/[id]` - Get lead
- `GET /api/analytics/campaign/[id]` - Campaign analytics
- `GET /api/analytics/org` - Organization analytics
- `GET /api/analytics/export/[id]` - Export campaign CSV
- `POST /api/webhooks/n8n/callback` - n8n webhook callback
- `GET /api/health` - Health check

## ⚙️ Configuration Files

### `vercel.json`
```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "framework": "nextjs",
  "installCommand": "npm install"
}
```

### `package.json` Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && prisma migrate deploy && next build",
    "start": "next start",
    "postinstall": "prisma generate"
  }
}
```

## 🔄 Real-time Updates

Instead of WebSocket (not supported on serverless), the app uses **polling**:

- Campaign detail page polls every 2 seconds
- Only polls when campaign is active (not completed)
- Automatically stops when campaign completes

See `hooks/use-polling.ts` for implementation.

## 🗄️ Database

- **Vercel Postgres**: Serverless PostgreSQL
- **Prisma ORM**: Type-safe database access
- **Migrations**: Run automatically during build
- **Schema**: Defined in `prisma/schema.prisma`

## 🚫 What's Removed

- ❌ **Redis**: Removed (not needed for simple deployment)
- ❌ **BullMQ**: Removed (process synchronously)
- ❌ **WebSocket**: Removed (use polling instead)
- ❌ **Separate Backend**: Everything in Next.js API routes

## ⚠️ Limitations

- **Function Timeout**: 10s (Hobby) or 60s (Pro plan)
- **No Background Jobs**: Process everything synchronously
- **Polling**: Uses HTTP polling instead of WebSocket
- **File Upload Size**: Limited by Vercel (4.5MB on Hobby)

## 🆘 Troubleshooting

### Build Fails

**Error: `DATABASE_URL` not found**
- Check environment variables in Vercel
- Ensure Vercel Postgres is created

**Error: Prisma client not generated**
- Check `postinstall` script in `package.json`
- Verify `prisma generate` runs during build

**Error: Migration fails**
- Check database connection string
- Verify migrations exist in `prisma/migrations/`
- Use `prisma db push` for first deployment if no migrations

### Runtime Errors

**500 Error on API routes**
- Check Vercel function logs
- Verify environment variables are set
- Check database connection

**CORS Errors**
- Not applicable (same origin)
- If using custom domain, ensure it's configured in Vercel

### Database Issues

**Tables don't exist**
- Run migrations: `npx prisma migrate deploy`
- Or use: `npx prisma db push` (for development)

**Connection errors**
- Verify `DATABASE_URL` is correct
- Check Vercel Postgres is active
- Ensure connection pool limits aren't exceeded

## 📊 Monitoring

- **Vercel Dashboard**: View deployments, logs, analytics
- **Function Logs**: Check API route errors
- **Database**: Monitor in Vercel Storage tab

## 🎯 Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test all features
3. ✅ Set up custom domain (optional)
4. ✅ Configure n8n webhook (if using)
5. ✅ Monitor performance

## 💰 Cost

- **Hobby Plan**: Free (with limitations)
- **Pro Plan**: $20/month (recommended for production)
- **Database**: Included in plan (with limits)

## 📚 Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

---

**Ready to deploy?** Follow the Quick Deploy steps above! 🚀

