# AI Calling CRM

An AI-powered CRM system that automates outbound calling using AI voice agents. Upload lead Excel sheets, create campaigns, and track real-time progress with WebSocket updates.

## 🚀 Quick Start

Choose the deployment method that works best for you:

- **🐳 Docker (Easiest)** - Recommended for beginners. One command sets up everything.
- **☁️ Vercel** - Deploy frontend on Vercel, backend on Railway/Render (see Vercel section)
- **💻 Manual Setup** - Full control, requires PostgreSQL and Redis installed locally

---

## 📋 Table of Contents

1. [Features](#-features)
2. [Prerequisites](#-prerequisites)
3. [Deployment Options](#-deployment-options)
   - [Option 1: Docker Deployment (Recommended)](#option-1-docker-deployment-recommended)
   - [Option 2: Vercel Deployment](#option-2-vercel-deployment)
   - [Option 3: Manual Setup](#option-3-manual-setup)
4. [Configuration](#-configuration)
5. [Usage Guide](#-usage-guide)
6. [Troubleshooting](#-troubleshooting)
7. [API Documentation](#-api-documentation)

---

## ✨ Features

- 📊 **Excel Upload & Validation**: Upload CSV/XLSX files with automatic column mapping
- 🎯 **Campaign Management**: Create and queue campaigns with automatic processing
- 🔄 **Real-time Updates**: WebSocket-powered real-time dashboard updates
- 📈 **Analytics**: Comprehensive metrics and reporting
- 📥 **CSV Export**: Export campaign results for downstream operations
- 🔒 **Security**: JWT authentication, HMAC webhook verification, encrypted phone numbers

---

## 📋 Prerequisites

### For Docker Deployment (Easiest)
- **Docker** and **Docker Compose** installed
- That's it! Docker handles everything else.

### For Vercel Deployment
- **Vercel account** (free tier works)
- **Railway/Render account** (for backend) or **Vercel Postgres** + **Upstash Redis**
- **GitHub account** (to connect repository)

### For Manual Setup
- **Node.js** 20.19+ (or use Prisma 5.x for Node 20.16)
- **PostgreSQL** database (installed and running)
- **Redis** server (installed and running)
- **npm** or **yarn**

---

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

**Best for**: Beginners, local development, self-hosted production

#### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd CRM
```

#### Step 2: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy example (if exists) or create new
touch .env
```

Edit `.env` with your configuration:

```env
# Database
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=crm_db
POSTGRES_PORT=5433

# Redis
REDIS_PORT=6380

# Backend Security (IMPORTANT: Change these!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_EXPIRES_IN=7d

# n8n Integration (optional)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_WEBHOOK_SECRET=your-webhook-secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**⚠️ Important**: Generate strong secrets:
- `JWT_SECRET`: At least 32 characters, random string
- `ENCRYPTION_KEY`: Exactly 32 characters, random string

You can generate them using:
```bash
# Generate JWT_SECRET (32+ chars)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (exactly 32 chars)
openssl rand -hex 16
```

#### Step 3: Start All Services

```bash
docker-compose up -d
```

This single command will:
- ✅ Start PostgreSQL database
- ✅ Start Redis cache
- ✅ Build and start backend API
- ✅ Build and start frontend application
- ✅ Run database migrations automatically

#### Step 4: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

#### Common Docker Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Stop and remove all data (WARNING: deletes database)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build

# Restart a specific service
docker-compose restart backend
```

#### First Use

1. Open http://localhost:3000
2. Click "Register" to create your account
3. Create your first campaign by uploading an Excel file
4. Monitor real-time progress on the dashboard

---

### Option 2: Vercel Deployment

**Best for**: Production deployment, easy scaling, automatic HTTPS

#### Overview

Vercel is perfect for the Next.js frontend, but the backend (NestJS) needs external services:
- **PostgreSQL**: Use Vercel Postgres, Supabase, or Neon
- **Redis**: Use Upstash Redis
- **Backend**: Deploy on Railway, Render, or Fly.io

#### Step 1: Deploy Frontend to Vercel

1. **Push your code to GitHub** (if not already)

2. **Go to [vercel.com](https://vercel.com)** and sign in

3. **Click "Add New Project"**

4. **Import your repository**

5. **Configure the project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

6. **Add Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

7. **Click "Deploy"**

Your frontend will be live at `https://your-project.vercel.app`

#### Step 2: Set Up Database (Vercel Postgres)

1. In your Vercel project, go to **Storage** tab
2. Click **Create Database** → **Postgres**
3. Copy the connection string (starts with `postgresql://`)

#### Step 3: Set Up Redis (Upstash)

1. Go to [upstash.com](https://upstash.com) and sign up
2. Create a new Redis database
3. Copy the connection details from the **Redis** tab (not REST API):
   - **Endpoint** (host, e.g., `your-redis.upstash.io`)
   - **Port** (usually `6379` or `6380`)
   - **Password** (the Redis password)
   
   **Note**: Use the Redis protocol endpoint, not the REST API endpoint.

#### Step 4: Deploy Backend (Railway - Recommended)

1. **Go to [railway.app](https://railway.app)** and sign in with GitHub

2. **Create New Project** → **Deploy from GitHub repo**

3. **Select your repository** and set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `./start.sh` (or `npx prisma migrate deploy && npm start`)
   
   **Note**: The `start.sh` script handles Prisma setup and migrations automatically. Alternatively, you can use the start command above.

4. **Add Environment Variables**:
   ```env
   DATABASE_URL=postgresql://... (from Vercel Postgres)
   REDIS_HOST=your-redis.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-upstash-redis-password
   JWT_SECRET=your-super-secret-jwt-key
   ENCRYPTION_KEY=your-32-character-encryption-key
   FRONTEND_URL=https://your-project.vercel.app
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
   N8N_WEBHOOK_SECRET=your-webhook-secret
   NODE_ENV=production
   PORT=3001
   ```

5. **Add PostgreSQL Plugin** (if using Railway's database):
   - Click **+ New** → **Database** → **PostgreSQL**
   - Railway will automatically set `DATABASE_URL`

6. **Deploy** - Railway will build and deploy automatically

7. **Copy your backend URL** (e.g., `https://your-backend.railway.app`)

#### Step 5: Update Frontend Environment Variable

1. Go back to **Vercel** → Your project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_API_URL` to your Railway backend URL
3. **Redeploy** the frontend

#### Alternative: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up
2. **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `crm-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`
5. Add the same environment variables as Railway
6. Deploy

#### Important Notes for Vercel Deployment

- ⚠️ **WebSocket Support**: Vercel has limited WebSocket support. For real-time features, consider:
  - Using Server-Sent Events (SSE) instead
  - Deploying backend on Railway/Render which supports WebSockets
  - Using a WebSocket service like Pusher or Ably

- ⚠️ **Backend Limitations**: NestJS apps work best on platforms like Railway, Render, or Fly.io rather than Vercel serverless functions

- ✅ **Frontend**: Next.js works perfectly on Vercel with automatic optimizations

---

### Option 3: Manual Setup

**Best for**: Full control, custom configurations, development

#### Step 1: Install Prerequisites

**macOS:**
```bash
# Install PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# Install Redis
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Install Redis
sudo apt install redis-server
sudo systemctl start redis
```

**Windows:**
- Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
- Download Redis from [redis.io](https://redis.io/download) or use WSL

#### Step 2: Set Up Database

```bash
# Create database
createdb crm_db

# Or using psql
psql -U postgres
CREATE DATABASE crm_db;
CREATE USER crm_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
\q
```

#### Step 3: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://crm_user:your-password@localhost:5432/crm_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_WEBHOOK_SECRET=your-webhook-secret
FRONTEND_URL=http://localhost:3000
PORT=3001
EOF

# Generate Prisma client (REQUIRED)
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start backend
npm run start:dev
```

Backend runs on `http://localhost:3001`

#### Step 4: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Start frontend
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## ⚙️ Configuration

### Environment Variables Reference

#### Backend (.env)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes | - |
| `REDIS_HOST` | Redis host address | ✅ Yes | `localhost` |
| `REDIS_PORT` | Redis port | ✅ Yes | `6379` |
| `REDIS_PASSWORD` | Redis password | ❌ No | - |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | ✅ Yes | - |
| `JWT_EXPIRES_IN` | JWT expiration time | ❌ No | `7d` |
| `ENCRYPTION_KEY` | AES encryption key (exactly 32 chars) | ✅ Yes | - |
| `N8N_WEBHOOK_URL` | n8n webhook endpoint | ❌ No | - |
| `N8N_WEBHOOK_SECRET` | n8n webhook secret for HMAC | ❌ No | - |
| `FRONTEND_URL` | Frontend URL for CORS | ✅ Yes | `http://localhost:3000` |
| `PORT` | Backend port | ❌ No | `3001` |
| `NODE_ENV` | Environment mode | ❌ No | `development` |

#### Frontend (.env.local)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | ✅ Yes | `http://localhost:3001` |

### Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, random secrets** for `JWT_SECRET` and `ENCRYPTION_KEY`
3. **Change default passwords** in production
4. **Use HTTPS** in production (automatic with Vercel)
5. **Set up proper CORS** origins
6. **Enable Redis password** if exposed to internet

---

## 📖 Usage Guide

### 1. Register/Login

- Navigate to `/login` to create an account or login
- Each user belongs to an organization
- First user creates the organization automatically

### 2. Create a Campaign

1. Go to "New Campaign" page
2. Upload an Excel file (CSV or XLSX, max 500 rows)
3. Map columns (phone is required, name is recommended)
4. Enter agent reference (for tracking)
5. Submit to create campaign

### 3. Monitor Campaign

- View campaign list at `/campaigns`
- Click on a campaign to see real-time updates
- Dashboard shows:
  - Progress (completed/total leads)
  - Metrics (qualified, scheduled, failed, etc.)
  - Lead outcomes in real-time

### 4. View Analytics

- Navigate to `/analytics`
- Filter by time period (Today, 7 Days, 30 Days)
- View overall performance metrics:
  - Total campaigns
  - Total leads
  - Success rates
  - Outcome breakdown

### 5. Export Results

- From campaign detail page, click "Export CSV"
- Download includes all lead data with outcomes
- Use for downstream operations or reporting

---

## 🔧 Troubleshooting

### Docker Issues

**Services won't start:**
```bash
# Check logs
docker-compose logs

# Check if ports are in use
lsof -i :3000
lsof -i :3001
lsof -i :5433
lsof -i :6380

# Restart services
docker-compose restart
```

**Database connection errors:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Access database directly
docker-compose exec postgres psql -U crm_user -d crm_db
```

**Backend build fails:**
```bash
# Rebuild without cache
docker-compose build --no-cache backend

# Check Prisma client is generated
docker-compose exec backend npx prisma generate
```

**Reset everything:**
```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

### Manual Setup Issues

**Database connection fails:**
- Ensure PostgreSQL is running: `pg_isready` or `systemctl status postgresql`
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Verify user has permissions: `GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;`

**Redis connection fails:**
- Ensure Redis is running: `redis-cli ping` (should return `PONG`)
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Test connection: `redis-cli -h localhost -p 6379`

**Prisma errors:**
```bash
# Regenerate Prisma client
cd backend
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status
```

**Port already in use:**
- Backend: Change `PORT` in `.env`
- Frontend: Use `npm run dev -- -p 3002` to change port

**WebSocket not working:**
- Check CORS settings in `backend/src/main.ts`
- Verify JWT token is being sent from frontend
- Check browser console for connection errors
- Ensure backend WebSocket server is running

### Vercel Deployment Issues

**Frontend build fails:**
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Verify build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`

**Backend deployment fails:**
- Check environment variables are set correctly
- Verify `DATABASE_URL` format
- Check build logs for errors
- Ensure Prisma client is generated in build step

**CORS errors:**
- Update `FRONTEND_URL` in backend environment variables
- Ensure it matches your Vercel frontend URL exactly

---

## 📚 API Documentation

### Authentication

- `POST /auth/register` - Register new user and organization
  ```json
  {
    "email": "user@example.com",
    "password": "secure-password",
    "name": "John Doe",
    "orgName": "My Company"
  }
  ```

- `POST /auth/login` - Login
  ```json
  {
    "email": "user@example.com",
    "password": "secure-password"
  }
  ```

- `GET /auth/me` - Get current user (requires JWT token)

### Campaigns

- `POST /campaigns/upload` - Upload Excel and create campaign (requires auth)
  - Content-Type: `multipart/form-data`
  - Body: `file` (Excel file), `agentReference` (string)

- `GET /campaigns` - List all campaigns (requires auth)

- `GET /campaigns/:id` - Get campaign details (requires auth)

### Leads

- `GET /leads/campaign/:campaignId` - Get leads for campaign (requires auth)

- `GET /leads/:leadId` - Get lead details (requires auth)

### Analytics

- `GET /analytics/campaign/:campaignId` - Get campaign metrics (requires auth)

- `GET /analytics/org?days=30` - Get organization metrics (requires auth)

- `GET /analytics/export/:campaignId` - Export campaign CSV (requires auth)

### Webhooks

- `POST /webhooks/n8n/callback` - n8n callback endpoint (HMAC protected)
  - Header: `x-signature` (HMAC signature)
  - Body: See n8n integration section below

### WebSocket Events

**Client → Server:**
- `subscribe:campaign` - Subscribe to campaign updates
  ```json
  { "campaignId": "uuid" }
  ```

**Server → Client:**
- `lead.updated` - Lead status/outcome updated
- `campaign.progress` - Campaign progress update
- `campaign.completed` - Campaign completed

---

## 🔗 n8n Integration

### Webhook Payload (CRM → n8n)

When a campaign is created, the CRM sends leads to your n8n webhook:

```json
{
  "campaign_id": "uuid",
  "org_id": "uuid",
  "agent_reference": "string",
  "leads": [
    {
      "lead_id": "uuid",
      "name": "John Doe",
      "phone": "encrypted-phone",
      "custom_fields": {}
    }
  ]
}
```

### Callback Payload (n8n → CRM)

After processing, n8n should send results back:

```json
{
  "campaign_id": "uuid",
  "lead_id": "uuid",
  "phone": "string",
  "outcome": "qualified | site_visit_scheduled | meeting_scheduled | no_answer | failed | validation_error",
  "site_visit_details": {
    "datetime": "2024-01-15T10:00:00Z",
    "location": "123 Main St"
  },
  "meeting_details": {
    "datetime": "2024-01-15T14:00:00Z",
    "location": "Office"
  },
  "timestamp": "2024-01-15T09:00:00Z"
}
```

**Important**: Include HMAC signature in `x-signature` header:
```
x-signature: sha256=<hmac_hash>
```

---

## 🗄️ Database Schema

### Organizations
- `org_id` (PK, UUID)
- `name` (string)
- `created_at`, `updated_at` (timestamps)

### Campaigns
- `campaign_id` (PK, UUID)
- `org_id` (FK)
- `agent_reference` (string)
- `status` (QUEUED, RUNNING, WAITING_FOR_CALLBACKS, COMPLETED, FAILED)
- `created_at`, `updated_at`, `completed_at` (timestamps)

### Leads
- `lead_id` (PK, UUID)
- `campaign_id` (FK)
- `name` (string, nullable)
- `phone` (encrypted string)
- `custom_fields` (JSON)
- `status` (PENDING, IN_PROGRESS, COMPLETED, VALIDATION_ERROR)
- `outcome` (QUALIFIED, SITE_VISIT_SCHEDULED, MEETING_SCHEDULED, NO_ANSWER, FAILED, VALIDATION_ERROR)
- `timestamp` (datetime)
- `meeting_details` (JSON, nullable)
- `site_visit_details` (JSON, nullable)
- `error_type` (string, nullable)
- `tags` (JSON, nullable)

---

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **WebSocket**: Socket.io
- **Authentication**: JWT

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **WebSocket**: Socket.io Client

---

## 📝 Development

### With Docker (Database Services Only)

Run databases in Docker, apps locally for faster development:

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# Run backend locally
cd backend
npm install
npx prisma generate
npm run start:dev

# Run frontend locally (another terminal)
cd frontend
npm install
npm run dev
```

### Without Docker

```bash
# Backend
cd backend
npm run start:dev  # Development mode with hot reload
npm run build      # Build for production
npm run start:prod # Run production build

# Frontend
cd frontend
npm run dev        # Development server
npm run build      # Build for production
npm run start      # Run production build
```

### Database Management

```bash
# Prisma Studio (visual database editor)
cd backend
npx prisma studio

# Run migrations
npx prisma migrate dev

# Check migration status
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

---

## 🔒 Security

- ✅ JWT authentication for API endpoints
- ✅ HMAC signature verification for n8n webhooks
- ✅ Phone numbers encrypted at rest using AES-256
- ✅ Org-level data isolation
- ✅ CORS configured for frontend domain
- ✅ Input validation and sanitization

---

## 📄 License

ISC

---

## 🆘 Need Help?

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review logs: `docker-compose logs` or check application logs
3. Verify environment variables are set correctly
4. Ensure all prerequisites are installed and running

---

## 🎯 Quick Reference

**Start with Docker:**
```bash
docker-compose up -d
```

**Access application:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

**View logs:**
```bash
docker-compose logs -f
```

**Stop everything:**
```bash
docker-compose down
```

---

## ✅ Deployment Checklist

Quick reference for deploying:

### Docker Deployment
- [ ] Docker and Docker Compose installed
- [ ] Create `.env` file with all required variables
- [ ] Generate strong `JWT_SECRET` (32+ characters) and `ENCRYPTION_KEY` (exactly 32 characters)
- [ ] Run `docker-compose up -d`
- [ ] Verify: http://localhost:3000 and http://localhost:3001
- [ ] Register first account

### Vercel Deployment
- [ ] Frontend: Push to GitHub, import to Vercel, set root to `frontend`
- [ ] Backend: Deploy on Railway/Render with PostgreSQL and Redis
- [ ] Set up Vercel Postgres or external PostgreSQL
- [ ] Set up Upstash Redis
- [ ] Configure all environment variables
- [ ] Update frontend `NEXT_PUBLIC_API_URL` with backend URL

### Security Checklist
- [ ] Strong `JWT_SECRET` (32+ random characters)
- [ ] Strong `ENCRYPTION_KEY` (exactly 32 random characters)
- [ ] Strong database password
- [ ] `.env` files not committed to git
- [ ] CORS configured correctly
- [ ] HTTPS enabled in production

### Post-Deployment Verification
- [ ] Frontend loads correctly
- [ ] Can register/login
- [ ] Can create campaign and upload Excel
- [ ] WebSocket connection works (real-time updates)
- [ ] Analytics page loads
- [ ] CSV export works
