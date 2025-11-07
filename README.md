# Plateforme IA de recommandation de carrière

Monorepo contenant:
- apps/web (React + Vite + Tailwind)
- apps/api (Node/Express + Prisma + JWT)
- apps/ml (FastAPI + spaCy + sentence-transformers)
- infra (PostgreSQL + pgvector, Redis, MinIO)

## Démarrage rapide

1. Installer Docker Desktop
2. `docker compose up -d`
3. Lancer `apps/ml`, puis `apps/api`, puis `apps/web`

## Services
- Postgres: 5432
- Adminer: 8080
- MinIO: 9000 (API) / 9001 (Console)
- Redis: 6379
- API: 3001
- Web: 5173
