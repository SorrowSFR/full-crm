.PHONY: help build up down logs restart clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

restart: ## Restart all services
	docker-compose restart

restart-backend: ## Restart backend service
	docker-compose restart backend

restart-frontend: ## Restart frontend service
	docker-compose restart frontend

clean: ## Stop services and remove volumes (WARNING: deletes data)
	docker-compose down -v

rebuild: ## Rebuild and restart all services
	docker-compose up -d --build

dev-db: ## Start only database services for local development
	docker-compose -f docker-compose.dev.yml up -d

dev-db-down: ## Stop development database services
	docker-compose -f docker-compose.dev.yml down

ps: ## Show running containers
	docker-compose ps

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-postgres: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U crm_user -d crm_db

migrate: ## Run database migrations
	docker-compose exec backend npx prisma migrate deploy

migrate-status: ## Check migration status
	docker-compose exec backend npx prisma migrate status

prisma-studio: ## Open Prisma Studio
	docker-compose exec backend npx prisma studio

