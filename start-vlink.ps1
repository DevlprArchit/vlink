$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting V-Link Python AI/ML Service on http://127.0.0.1:8001 ..."
$aiProc = Start-Process -FilePath "$root\.venv\Scripts\python.exe" `
  -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001" `
  -WorkingDirectory "$root\ai-service" `
  -PassThru

Write-Host "Starting V-Link Next.js App on http://localhost:3000 ..."
try {
  Push-Location "$root\frontend"
  $env:AI_SERVICE_URL = "http://127.0.0.1:8001"
  npm run dev
} finally {
  Pop-Location
  if ($aiProc -and !$aiProc.HasExited) {
    Stop-Process -Id $aiProc.Id -Force
  }
}
