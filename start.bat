@echo off
title AI Study Assistant
echo [1/3] Starting PostgreSQL + Qdrant (Docker)...
docker compose up -d postgres qdrant

echo [2/3] Starting Backend...
start "Backend" cmd /c "cd /d %~dp0backend && python -X utf8 -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [3/3] Starting Frontend...
start "Frontend" cmd /c "cd /d %~dp0frontend && npx next dev --port 3001"

echo.
echo ============================================
echo  AI Study Assistant
echo ============================================
echo  Frontend: http://localhost:3001
echo  Backend:  http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo ============================================
