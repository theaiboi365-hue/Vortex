$ErrorActionPreference = "Stop"
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
  Write-Host "Starting Vortex..." -ForegroundColor Cyan
  Write-Host "Setup UI: http://127.0.0.1:8787" -ForegroundColor Green
  npm.cmd start
}
finally {
  Pop-Location
}
