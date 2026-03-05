# Hackathon Project

Two separate projects running together:

## Frontend - frontend

Next.js application.

```bash
cd frontend
bun run dev
```

## Backend - backend

FastAPI server.

```bash
cd backend
uv sync
uvicorn main:app --reload
```

## Running Both

Open **two terminal windows**:

```bash
# Terminal 1 - Frontend (http://localhost:3000)
cd frontend && bun run dev

# Terminal 2 - Backend (http://localhost:8000)
cd backend && uvicorn main:app --reload
```
