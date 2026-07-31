# ====================================================
# start.ps1 - SNS AutoPost Pro 전체 서버 실행 스크립트
# PowerShell에서 실행: .\start.ps1
# ====================================================

Write-Host "🚀 SNS AutoPost Pro 시작 중..." -ForegroundColor Cyan
Write-Host ""

# 환경 변수 로드
if (Test-Path ".\.env") {
    Write-Host "✅ .env 파일 로드 완료" -ForegroundColor Green
} else {
    Write-Host "❌ .env 파일이 없습니다. .env 파일을 확인해주세요." -ForegroundColor Red
    exit 1
}

# 백엔드 실행 (새 PowerShell 창)
Write-Host "⚡ FastAPI 백엔드 서버 시작 (Port: 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

Start-Sleep -Seconds 2

# 프론트엔드 실행 (새 PowerShell 창)
Write-Host "🎨 Vite 프론트엔드 서버 시작 (Port: 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  ✅ SNS AutoPost Pro 실행 중!" -ForegroundColor Green
Write-Host ""
Write-Host "  📡 프론트엔드: http://localhost:5173" -ForegroundColor White
Write-Host "  🔌 백엔드 API: http://localhost:8000" -ForegroundColor White
Write-Host "  📚 API 문서:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# 브라우저 열기
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
