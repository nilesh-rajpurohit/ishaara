Write-Host "Starting Ishaara Platform..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\api'; npx tsx src/app.ts"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\web'; pnpm dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\ml-service'; .venv\Scripts\Activate.ps1; uvicorn app.main:app --host 0.0.0.0 --port 8001"

Write-Host "All services starting..." -ForegroundColor Green
Write-Host "API:     http://localhost:3001" -ForegroundColor Yellow
Write-Host "Web:     http://localhost:3000" -ForegroundColor Yellow
Write-Host "ML:      http://localhost:8001" -ForegroundColor Yellow
