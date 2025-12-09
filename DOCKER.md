# Docker Deployment Guide

This guide covers Docker deployment for the AI Calling CRM system.

## Quick Start

```bash
# 1. Copy environment file
cp .env.docker.example .env

# 2. Edit .env with your settings
# IMPORTANT: Change JWT_SECRET and ENCRYPTION_KEY!

# 3. Start all services
docker-compose up -d

# 4. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

## Architecture

The Docker setup includes:

- **PostgreSQL** (port 5432): Database server
- **Redis** (port 6379): Cache and queue server
- **Backend** (port 3001): NestJS API server
- **Frontend** (port 3000): Next.js web application

All services run in isolated containers and communicate via Docker network.

## Configuration

### Environment Variables

Edit `.env` file (or set environment variables):

```env
# Database
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=secure-password-here
POSTGRES_DB=crm_db
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Backend
BACKEND_PORT=3001
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=your-32-character-encryption-key
NODE_ENV=production

# n8n Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_WEBHOOK_SECRET=your-webhook-secret

# Frontend
FRONTEND_PORT=3000
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Security Notes

1. **Change default passwords** - Never use default values in production
2. **Use strong secrets** - JWT_SECRET and ENCRYPTION_KEY should be random and secure
3. **Set REDIS_PASSWORD** - If Redis is exposed, set a password
4. **Configure CORS** - Set FRONTEND_URL to your actual domain

## Common Commands

### Using Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Restart a service
docker-compose restart backend
```

### Using Makefile (Recommended)

```bash
# Show all available commands
make help

# Start services
make up

# View logs
make logs

# Rebuild everything
make rebuild

# Stop and clean (removes volumes)
make clean
```

## Development Workflow

### Option 1: Full Docker Development

Run everything in Docker:

```bash
docker-compose up -d
# Make code changes
docker-compose up -d --build  # Rebuild affected services
```

### Option 2: Hybrid Development

Run databases in Docker, apps locally:

```bash
# Start only databases
make dev-db

# Run backend locally
cd backend
npm run start:dev

# Run frontend locally (another terminal)
cd frontend
npm run dev
```

## Database Management

### Access PostgreSQL

```bash
# Using docker-compose
docker-compose exec postgres psql -U crm_user -d crm_db

# Or using make
make shell-postgres
```

### Run Migrations

```bash
# Migrations run automatically on backend startup
# Or manually:
docker-compose exec backend npx prisma migrate deploy

# Check migration status
make migrate-status
```

### Prisma Studio

```bash
# Open Prisma Studio in browser
make prisma-studio
# Or:
docker-compose exec backend npx prisma studio
```

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U crm_user crm_db > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U crm_user crm_db < backup.sql
```

## Troubleshooting

### Services Won't Start

1. **Check logs**:
```bash
docker-compose logs
```

2. **Check if ports are in use**:
```bash
# Check port 3000, 3001, 5432, 6379
lsof -i :3000
```

3. **Verify environment variables**:
```bash
docker-compose config
```

### Database Connection Issues

```bash
# Check if PostgreSQL is healthy
docker-compose ps

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec backend npx prisma db pull
```

### Backend Build Fails

```bash
# Clear build cache
docker-compose build --no-cache backend

# Check Node version compatibility
docker-compose exec backend node --version
```

### Frontend Build Fails

```bash
# Clear build cache
docker-compose build --no-cache frontend

# Check if .env.local is needed
docker-compose exec frontend env | grep NEXT_PUBLIC
```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove images (optional)
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## Production Deployment

### Recommended Setup

1. **Use Docker secrets** or environment variable management
2. **Set up reverse proxy** (nginx/traefik) for SSL
3. **Configure backups** for PostgreSQL volume
4. **Set resource limits** in docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

5. **Use health checks** (already configured)
6. **Set up monitoring** (Prometheus, Grafana, etc.)

### Example Production Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    restart: always
    environment:
      NODE_ENV: production
    deploy:
      resources:
        limits:
          memory: 1G

  frontend:
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Volumes and Data Persistence

Data is persisted in Docker volumes:

- `postgres_data`: Database files
- `redis_data`: Redis persistence

To backup volumes:

```bash
# Backup PostgreSQL
docker run --rm -v crm_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore PostgreSQL
docker run --rm -v crm_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

## Networking

All services communicate via the `crm-network` bridge network.

- Services can reach each other by service name (e.g., `postgres`, `redis`)
- Ports are exposed to host for external access
- Use service names in connection strings (not `localhost`)

Example connection string in container:
```
DATABASE_URL=postgresql://crm_user:password@postgres:5432/crm_db
```

## Health Checks

Health check endpoints:

- Backend: `http://localhost:3001/health`
- Frontend: `http://localhost:3000`

Check health:
```bash
curl http://localhost:3001/health
```

## Scaling

To scale services (if needed):

```bash
# Scale backend (requires load balancer)
docker-compose up -d --scale backend=3

# Note: Frontend is stateless and can be scaled similarly
```

## Updates and Upgrades

1. **Pull latest code**
2. **Rebuild images**:
```bash
docker-compose up -d --build
```
3. **Run migrations** (if any):
```bash
make migrate
```

## Security Best Practices

1. ✅ Use strong passwords and secrets
2. ✅ Don't expose database ports publicly
3. ✅ Use Docker secrets for sensitive data
4. ✅ Keep images updated
5. ✅ Use non-root users in containers (already configured)
6. ✅ Enable Redis password if exposed
7. ✅ Configure proper CORS origins
8. ✅ Use HTTPS in production (via reverse proxy)

