param([switch])

Write-Host "==============================" -ForegroundColor Cyan
Write-Host " AI Study Assistant" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

if (-not ) {
    Write-Host "[1/3] Starting Docker services..." -ForegroundColor Yellow
    docker compose up -d postgres qdrant
    Start-Sleep 3
}

Write-Host "[2/3] Starting Backend..." -ForegroundColor Yellow
Start-Process -WindowStyle Hidden -FilePath python -ArgumentList "-X utf8 -m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory "\backend"

Write-Host "[3/3] Starting Frontend..." -ForegroundColor Yellow
Start-Process -WindowStyle Hidden -FilePath "npx.cmd" -ArgumentList "next dev --port 3001" -WorkingDirectory "\frontend"

Start-Sleep 4
Write-Host "
All services started!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  Test:     demo / demo123" -ForegroundColor Cyan
