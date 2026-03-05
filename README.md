# Hackathon Project

Two separate projects running together:

## Frontend - hackathon-timepass

Next.js application.

```bash
cd hackathon-timepass
npm run dev
```

## Backend - api-endpoint

FastAPI server.

```bash
cd api-endpoint
uv sync
uvicorn main:app --reload
```

## Running Both

Open **two terminal windows**:

```bash
# Terminal 1 - Frontend (http://localhost:3000)
cd hackathon-timepass && npm run dev

# Terminal 2 - Backend (http://localhost:8000)
cd api-endpoint && uvicorn main:app --reload
```
