# Secure Software Project

This repository contains a minimal three-tier setup:
- Frontend: plain static HTML/CSS/JS served by Nginx in Docker.
- Backend: Express.js written in TypeScript.
- Database: PostgreSQL (local via Docker).

You can run each project individually with its own docker-compose, or run the entire stack from the repository root.

## Project Structure

- frontend/
  - Static site assets and Dockerfile.
  - docker-compose.yml (runs only the frontend)
- backend/
  - TypeScript Express server, Dockerfile, and a per-backend docker-compose with its own Postgres instance.
- docker-compose.yml (root)
  - Orchestrates frontend, backend, and a shared Postgres instance.

## Quick Start: Run the whole stack

Requirements:
- Docker Desktop with Compose v2

From the repository root (PowerShell):

```powershell
# Build and start all services
docker compose up --build

# Services
# Ian cooked here.
# - Frontend: http://localhost:3000
# - Backend:  http://localhost:4000/health
# - Postgres: localhost:5432 (user: app, password: app, db: app)
```

To stop:

```powershell
docker compose down
```

To remove volumes as well:

```powershell
docker compose down -v
```

## Run only the frontend

From the frontend directory:

```powershell
cd frontend
docker compose up --build
# Visit http://localhost:8080
```

## Run only the backend (with a local Postgres just for backend)

From the backend directory:

```powershell
cd backend
docker compose up --build
# Backend:  http://localhost:4000/health
# Postgres: localhost:5433 (user: app, password: app, db: app)
```

## Configuration

The backend reads database configuration from environment variables with these defaults (matching docker-compose):
- PGHOST=postgres (root stack) or db (backend-only compose)
- PGPORT=5432
- PGUSER=app
- PGPASSWORD=app
- PGDATABASE=app
- PORT=4000 (backend HTTP port)

The frontend JavaScript calls the backend at the same host on port 4000, which works when running Docker containers with port mappings (browser requests go to localhost). If you need a different port, edit `frontend/script.js`.

## Development notes

- Backend uses TypeScript. In a local (non-Docker) development flow you can run:

```powershell
cd backend
npm install
npm run dev
```

- CORS is enabled on the backend for simplicity.
- The `/health` endpoint verifies DB connectivity using `SELECT 1`.

## Security note

This is a minimal scaffold intended for local development and demonstration. Credentials are intentionally simple and defined in compose files. Do not use as-is in production.
