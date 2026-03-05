# Hackathon Project

Two separate projects running together:

## Frontend - frontend

Next.js application.

```bash
cd frontend
bun run dev
```

## API Service - api

FastAPI server for extra API endpoints (Next.js handles main CRUD).

```bash
cd api
uv sync
uvicorn main:app --reload
```

## Running Both

Open **two terminal windows**:

```bash
# Terminal 1 - Frontend (http://localhost:3000)
cd frontend && bun run dev

# Terminal 2 - API Service (http://localhost:8000)
cd api && uvicorn main:app --reload
```
