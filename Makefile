# Ezra VaBitaron — Lottery System Makefile

.PHONY: help dev-infra backend frontend seed worker typecheck clean

help:
	@echo "Available commands:"
	@echo "  make dev-infra   Start Postgres, Redis, MinIO via Docker"
	@echo "  make backend     Start FastAPI backend (port 8000)"
	@echo "  make frontend    Start Next.js frontend (port 3000)"
	@echo "  make seed        Seed database with demo data"
	@echo "  make worker      Start RQ background worker"
	@echo "  make gen-docs    Generate synthetic test document images"
	@echo "  make typecheck   Run frontend TypeScript type check"
	@echo "  make migrate     Run Alembic database migrations"
	@echo "  make clean       Stop all local services"

dev-infra:
	docker compose up -d postgres redis minio
	@echo "✅ Infrastructure running:"
	@echo "   Postgres:  localhost:5432"
	@echo "   Redis:     localhost:6379"
	@echo "   MinIO:     localhost:9000 (console: localhost:9001)"

backend:
	@cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	@cd frontend && npm run dev

seed:
	@cd backend && source venv/bin/activate && python seed.py

worker:
	@cd backend && source venv/bin/activate && rq worker verification --url $$REDIS_URL

gen-docs:
	@cd backend && source venv/bin/activate && python tests/generate_test_docs.py

typecheck:
	@cd frontend && npx tsc --noEmit

migrate:
	@cd backend && source venv/bin/activate && DATABASE_URL=$$DATABASE_URL alembic upgrade head

clean:
	@pkill -f "uvicorn app.main" || true
	@pkill -f "next dev" || true
	@echo "Services stopped"
