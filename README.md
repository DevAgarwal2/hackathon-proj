# Hackathon Project

Two separate projects running together:

## Frontend - frontend

Next.js application.

```bash
cd frontend
bun run dev
```

## FastAPI Endpoint - fastapi-endpoint

FastAPI server for extra API endpoints (Next.js handles main CRUD).

```bash
cd fastapi-endpoint
uv sync
uvicorn main:app --reload
```

## Running Both

Open **two terminal windows**:

```bash
# Terminal 1 - Frontend (http://localhost:3000)
cd frontend && bun run dev

# Terminal 2 - FastAPI Endpoint (http://localhost:8000)
cd fastapi-endpoint && uvicorn main:app --reload
```
