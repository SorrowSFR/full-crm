# Quick Start Guide

## Prerequisites

### Option A: Docker (Recommended - Easiest)

- **Docker** and **Docker Compose** installed
- That's it! Docker will handle PostgreSQL and Redis

### Option B: Manual Setup

1. **PostgreSQL** - Install and start PostgreSQL
2. **Redis** - Install and start Redis
3. **Node.js** - Version 20.19+ (or use Prisma 5.x for 20.16)

## Quick Start with Docker (Recommended)

1. **Set up environment variables**:
```bash
cp .env.docker.example .env
# Edit .env with your settings (especially JWT_SECRET and ENCRYPTION_KEY)
```

2. **Start everything**:
```bash
docker-compose up -d
```

3. **Access the application**:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

4. **Register your first account** and start creating campaigns!

**That's it!** All services (PostgreSQL, Redis, Backend, Frontend) are running.

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

## Manual Setup (Without Docker)

## Step 1: Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database and Redis credentials

# Generate Prisma client (REQUIRED - must run before building)
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Start backend
npm run start:dev
```

**Important:** Always run `npx prisma generate` after installing dependencies or when the Prisma schema changes. This generates the TypeScript types for your database models and enums.

Backend runs on `http://localhost:3001`

## Step 2: Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Start frontend
npm run dev
```

Frontend runs on `http://localhost:3000`

## Step 3: First Use

1. Open `http://localhost:3000`
2. Click "Register" to create an account
3. Create your first campaign by uploading an Excel file
4. Map columns (phone is required)
5. Monitor real-time progress

## Testing n8n Integration

1. Set up your n8n webhook URL in backend `.env`:
   ```
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
   N8N_WEBHOOK_SECRET=your-secret-key
   ```

2. Configure n8n to:
   - Receive webhook from CRM
   - Loop through leads
   - Call Ultravox API
   - Send callback to CRM at `/webhooks/n8n/callback` with HMAC signature

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env`
- Run `npx prisma studio` to verify connection

### Redis Connection Issues
- Ensure Redis is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT in `.env`

### WebSocket Not Working
- Check CORS settings in `backend/src/main.ts`
- Verify JWT token is being sent from frontend
- Check browser console for connection errors

### Port Already in Use
- Backend: Change PORT in `.env`
- Frontend: Use `npm run dev -- -p 3001` to change port

