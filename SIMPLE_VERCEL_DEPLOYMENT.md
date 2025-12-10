# Simple Vercel Deployment - Complete Guide

Deploy everything on Vercel: frontend, backend (API routes), and database (Vercel Postgres).

## ✅ What's Included

- ✅ Frontend: Next.js (already set up)
- ✅ Backend: Next.js API Routes (in `/app/api`)
- ✅ Database: Vercel Postgres (serverless, no setup needed)
- ✅ No Redis: Removed (not needed for simple deployment)
- ✅ No WebSocket: Removed (use polling for updates)
- ✅ Single deployment: Everything in one place

## 🚀 Quick Start

### Step 1: Set Up Vercel Postgres

1. Go to [vercel.com](https://vercel.com) → Your Project
2. Click **Storage** tab
3. Click **Create Database** → **Postgres**
4. Wait for it to be created
5. Copy the connection string (starts with `postgresql://`)

### Step 2: Add Environment Variables

Go to **Settings** → **Environment Variables** and add:

```env
# Database (from Vercel Postgres - auto-populated)
DATABASE_URL=postgresql://...

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

### Step 3: Deploy to Vercel

1. **Push code to GitHub** (if not already)
2. **Go to Vercel** → **Add New Project**
3. **Import your repository**
4. **Configure:**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend` (or leave blank if frontend is root)
   - **Build Command**: `prisma generate && next build` (auto-set)
   - **Output Directory**: `.next` (auto-set)
5. **Add Environment Variables** (from Step 2)
6. **Click Deploy**

### Step 4: Run Database Migrations

After first deployment:

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Open **Functions** tab
4. Or use Vercel CLI:
   ```bash
   vercel env pull
   npx prisma migrate deploy
   ```

Or add to `package.json` scripts:
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

## 📁 Project Structure

```
frontend/
├── app/
│   ├── api/              # API routes (backend)
│   │   ├── auth/
│   │   │   ├── register/route.ts
│   │   │   ├── login/route.ts
│   │   │   └── me/route.ts
│   │   ├── campaigns/
│   │   ├── leads/
│   │   └── analytics/
│   ├── campaigns/        # Frontend pages
│   ├── login/
│   └── ...
├── lib/
│   ├── prisma.ts        # Prisma client
│   ├── jwt.ts           # JWT utilities
│   └── auth-utils.ts    # Auth helpers
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json
```

## 🔧 API Routes Created

- ✅ `POST /api/auth/register` - Register new user
- ✅ `POST /api/auth/login` - Login
- ✅ `POST /api/auth/me` - Get current user
- ✅ `GET /api/health` - Health check

## 📝 Next Steps

1. **Create remaining API routes:**
   - `/api/campaigns/route.ts` - List campaigns
   - `/api/campaigns/upload/route.ts` - Upload Excel
   - `/api/campaigns/[id]/route.ts` - Get campaign
   - `/api/leads/route.ts` - Get leads
   - `/api/analytics/route.ts` - Analytics

2. **Update frontend API calls:**
   - Change from `http://backend-url/api` to `/api`
   - Remove WebSocket code
   - Use polling for real-time updates

3. **Remove dependencies:**
   - Remove `socket.io-client` from package.json
   - Remove Redis/BullMQ references

## ⚠️ Limitations

- **No WebSocket**: Use polling (setInterval) for real-time updates
- **No Background Jobs**: Process everything synchronously
- **Function Timeout**: 10s (Hobby) or 60s (Pro plan)
- **No Redis**: Use database for caching if needed

## 🎯 Benefits

✅ Single deployment
✅ No separate services
✅ Automatic scaling
✅ Built-in database
✅ Free tier available
✅ Simple and cost-effective

## 🆘 Troubleshooting

**Build fails:**
- Check `DATABASE_URL` is set
- Ensure Prisma schema is in `frontend/prisma/`
- Run `npx prisma generate` locally first

**Database connection errors:**
- Verify `DATABASE_URL` from Vercel Postgres
- Check migrations ran: `npx prisma migrate status`

**API routes not working:**
- Check route files are in `app/api/`
- Verify file exports `GET`, `POST`, etc.
- Check Vercel function logs

