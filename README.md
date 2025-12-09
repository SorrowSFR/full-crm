# AI Calling CRM

An AI-powered CRM system that automates outbound calling using AI voice agents. Upload lead Excel sheets, create campaigns, and track real-time progress with WebSocket updates.

## Features

- 📊 **Excel Upload & Validation**: Upload CSV/XLSX files with automatic column mapping and validation
- 🎯 **Campaign Management**: Create and queue campaigns with automatic processing
- 🔄 **Real-time Updates**: WebSocket-powered real-time dashboard updates
- 📈 **Analytics**: Comprehensive metrics and reporting
- 📥 **CSV Export**: Export campaign results for downstream operations
- 🔒 **Security**: JWT authentication, HMAC webhook verification, encrypted phone numbers

## Tech Stack

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

## Prerequisites

### For Docker Deployment
- Docker and Docker Compose
- (Optional) Node.js 20.19+ for local development

### For Manual Setup
- Node.js 20.19+ (or use Prisma 5.x for Node 20.16)
- PostgreSQL database
- Redis server
- npm or yarn

## Deployment Options

### Option 1: Docker Deployment (Recommended)

The easiest way to get started is using Docker Compose, which sets up all services automatically.

#### Quick Start with Docker

1. **Clone the repository** (if not already done):
```bash
git clone <repository-url>
cd CRM
```

2. **Set up environment variables**:
```bash
cp .env.docker.example .env
```

Edit `.env` with your configuration:
```env
# Database
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=crm_db

# Security (IMPORTANT: Change these!)
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key

# n8n Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_WEBHOOK_SECRET=your-webhook-secret

# Frontend URL (adjust if deploying to different domain)
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. **Start all services**:
```bash
docker-compose up -d
```

This will:
- Start PostgreSQL database
- Start Redis cache
- Build and start backend API
- Build and start frontend application
- Run database migrations automatically

4. **Access the application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

#### Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build

# Restart a specific service
docker-compose restart backend
```

#### Development with Docker

For development, you can run only the database services in Docker and run the apps locally:

1. **Start only database services**:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. **Update your local `.env` files** to connect to Docker services:
```env
# backend/.env
DATABASE_URL="postgresql://crm_user:crm_password@localhost:5432/crm_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
```

3. **Run backend and frontend locally** (see Manual Setup below)

#### Production Deployment

For production, consider:

1. **Use environment-specific `.env` file** or secrets management
2. **Set strong passwords** for database and JWT secrets
3. **Configure proper CORS** origins in `FRONTEND_URL`
4. **Use reverse proxy** (nginx/traefik) for SSL termination
5. **Set up backups** for PostgreSQL volume
6. **Monitor logs** and set up health checks

Example production `docker-compose.override.yml`:
```yaml
services:
  backend:
    environment:
      NODE_ENV: production
    restart: always
  
  frontend:
    restart: always
```

### Option 2: Manual Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/crm_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_WEBHOOK_SECRET=your-webhook-secret
ENCRYPTION_KEY=your-32-character-encryption-key
```

4. Generate Prisma client (required before building):
```bash
npx prisma generate
```

5. Set up the database:
```bash
npx prisma migrate dev
```

5. Start the backend:
```bash
npm run start:dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

4. Start the frontend:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

### 1. Register/Login
- Navigate to `/login` to create an account or login
- Each user belongs to an organization

### 2. Create a Campaign
- Go to "New Campaign"
- Upload an Excel file (CSV or XLSX, max 500 rows)
- Map columns (phone is required)
- Enter agent reference
- Submit to create campaign

### 3. Monitor Campaign
- View campaign list at `/campaigns`
- Click on a campaign to see real-time updates
- Dashboard shows progress, metrics, and lead outcomes

### 4. View Analytics
- Navigate to `/analytics`
- Filter by time period (Today, 7 Days, 30 Days)
- View overall performance metrics

### 5. Export Results
- From campaign detail page, click "Export CSV"
- Download includes all lead data with outcomes

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user and organization
- `POST /auth/login` - Login
- `POST /auth/me` - Get current user (protected)

### Campaigns
- `POST /campaigns/upload` - Upload Excel and create campaign
- `GET /campaigns` - List all campaigns (protected)
- `GET /campaigns/:id` - Get campaign details (protected)

### Leads
- `GET /leads/campaign/:campaignId` - Get leads for campaign (protected)
- `GET /leads/:leadId` - Get lead details (protected)

### Analytics
- `GET /analytics/campaign/:campaignId` - Get campaign metrics (protected)
- `GET /analytics/org?days=30` - Get org metrics (protected)
- `GET /analytics/export/:campaignId` - Export campaign CSV (protected)

### Webhooks
- `POST /webhooks/n8n/callback` - n8n callback endpoint (HMAC protected)

## WebSocket Events

### Client → Server
- `subscribe:campaign` - Subscribe to campaign updates

### Server → Client
- `lead.updated` - Lead status/outcome updated
- `campaign.progress` - Campaign progress update
- `campaign.completed` - Campaign completed

## n8n Integration

### Webhook Payload (CRM → n8n)
```json
{
  "campaign_id": "uuid",
  "org_id": "uuid",
  "agent_reference": "string",
  "leads": [
    {
      "lead_id": "uuid",
      "name": "string",
      "phone": "string",
      "custom_fields": {}
    }
  ]
}
```

### Callback Payload (n8n → CRM)
```json
{
  "campaign_id": "uuid",
  "lead_id": "uuid",
  "phone": "string",
  "outcome": "qualified | site_visit_scheduled | meeting_scheduled | no_answer | failed | validation_error",
  "site_visit_details": {
    "datetime": "ISO8601",
    "location": "string"
  },
  "meeting_details": {
    "datetime": "ISO8601",
    "location": "string"
  },
  "timestamp": "ISO8601"
}
```

Include HMAC signature in `x-signature` header.

## Database Schema

### Organizations
- `org_id` (PK)
- `name`
- `created_at`, `updated_at`

### Campaigns
- `campaign_id` (PK)
- `org_id` (FK)
- `agent_reference`
- `status` (QUEUED, RUNNING, WAITING_FOR_CALLBACKS, COMPLETED, FAILED)
- `created_at`, `updated_at`, `completed_at`

### Leads
- `lead_id` (PK)
- `campaign_id` (FK)
- `name`
- `phone` (encrypted)
- `custom_fields` (JSON)
- `status` (PENDING, IN_PROGRESS, COMPLETED, VALIDATION_ERROR)
- `outcome` (QUALIFIED, SITE_VISIT_SCHEDULED, MEETING_SCHEDULED, NO_ANSWER, FAILED, VALIDATION_ERROR)
- `timestamp`
- `meeting_details` (JSON)
- `site_visit_details` (JSON)
- `error_type`
- `tags` (JSON)

## Security

- JWT authentication for API endpoints
- HMAC signature verification for n8n webhooks
- Phone numbers encrypted at rest using AES
- Org-level data isolation
- CORS configured for frontend domain

## Development

### With Docker (Database Services Only)

Start database services in Docker, run apps locally:

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# Run backend locally
cd backend
npm install
npx prisma generate  # Generate Prisma client (required)
npm run start:dev

# Run frontend locally (in another terminal)
cd frontend
npm install
npm run dev
```

### Without Docker

### Backend
```bash
cd backend
npm run start:dev  # Development mode with hot reload
npm run build      # Build for production
npm run start:prod # Run production build
```

### Frontend
```bash
cd frontend
npm run dev        # Development server
npm run build      # Build for production
npm run start      # Run production build
```

## Docker Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check PostgreSQL logs
docker-compose logs postgres

# Access PostgreSQL directly
docker-compose exec postgres psql -U crm_user -d crm_db
```

### Backend Not Starting
```bash
# Check backend logs
docker-compose logs backend

# Rebuild backend
docker-compose up -d --build backend

# Check if Prisma client is generated
docker-compose exec backend npx prisma generate

# Check if migrations ran
docker-compose exec backend npx prisma migrate status
```

### TypeScript Compilation Errors

If you see errors about missing Prisma types (`LeadOutcome`, `LeadStatus`, `CampaignStatus`):

```bash
# Generate Prisma client
cd backend
npx prisma generate
```

If you see errors about missing `passport-local`:

```bash
# Install missing dependency
cd backend
npm install passport-local @types/passport-local
```

### Frontend Build Issues
```bash
# Rebuild frontend
docker-compose up -d --build frontend

# Check frontend logs
docker-compose logs frontend
```

### Reset Everything
```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove images (optional)
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## Docker Deployment

For Docker deployment instructions, see [DOCKER.md](./DOCKER.md).

Quick start:
```bash
cp .env.docker.example .env
# Edit .env with your settings
docker-compose up -d
```

## License

ISC

