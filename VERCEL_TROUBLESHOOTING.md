# Vercel Git Integration Troubleshooting

## Common Issues & Solutions

### 1. **Root Directory Not Set Correctly**

Since your Next.js app is in the `frontend/` folder, Vercel needs to know this.

**Fix:**
1. Go to Vercel Dashboard → Your Project → **Settings** → **General**
2. Scroll to **Root Directory**
3. Set it to: `frontend`
4. Click **Save**

### 2. **Vercel Not Connected to GitHub**

**Check:**
1. Go to Vercel Dashboard → Your Project → **Settings** → **Git**
2. Verify it shows: `SorrowSFR/full-crm`
3. If not connected, click **Connect Git Repository**

### 3. **Wrong Branch Selected**

**Check:**
1. Go to Vercel Dashboard → Your Project → **Settings** → **Git**
2. Under **Production Branch**, ensure it's set to: `main`
3. Check **Preview Branches** - should include `main`

### 4. **Auto-Deployments Disabled**

**Check:**
1. Go to Vercel Dashboard → Your Project → **Settings** → **Git**
2. Ensure **Automatic deployments from Git** is **Enabled**
3. Ensure **Production deployments** is set to **Automatic**

### 5. **Manual Trigger**

If auto-deploy isn't working, trigger manually:

1. Go to Vercel Dashboard → Your Project → **Deployments** tab
2. Click **Redeploy** → **Use existing Build Cache** (optional)
3. Or click **Redeploy** → **Redeploy with existing Build Cache**

### 6. **Check Deployment Logs**

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Check **Build Logs** for errors
4. Common issues:
   - Missing environment variables
   - Build command failing
   - Prisma errors

### 7. **Verify Git Push**

Make sure your code is actually pushed:

```bash
# Check current branch
git branch

# Check if you're on main
git checkout main

# Verify latest commit is pushed
git log origin/main -1

# If not pushed, push it
git push origin main
```

### 8. **Reconnect Repository**

If nothing works, reconnect:

1. Go to Vercel Dashboard → Your Project → **Settings** → **Git**
2. Click **Disconnect**
3. Go to **Add New Project**
4. **Import** `SorrowSFR/full-crm` again
5. **Root Directory**: `frontend`
6. **Framework**: Next.js
7. Add environment variables
8. Deploy

## Quick Checklist

- [ ] Root Directory set to `frontend`
- [ ] Connected to `SorrowSFR/full-crm` repository
- [ ] Production branch is `main`
- [ ] Auto-deployments enabled
- [ ] Latest code pushed to GitHub
- [ ] Environment variables set
- [ ] Build command works locally

## Test Locally First

Before deploying, test the build locally:

```bash
cd frontend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

If this works, Vercel should work too.

## Still Not Working?

1. Check Vercel Status: https://vercel-status.com
2. Check GitHub webhook: GitHub → Settings → Webhooks → Look for Vercel
3. Check Vercel logs for specific errors
4. Try manual deployment first to see if it's a Git issue or build issue

