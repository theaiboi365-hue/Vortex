$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Codex Social Bridge installer" -ForegroundColor Cyan
Write-Host "This installs dependencies, prepares .env, and gives you the setup UI." -ForegroundColor Gray
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is missing. Install Node.js 20+ from https://nodejs.org, then run this again." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Write-Host "npm is missing. Reinstall Node.js with npm enabled." -ForegroundColor Red
  exit 1
}

Push-Location (Split-Path -Parent $PSScriptRoot)
try {
  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Green
  }

  npm.cmd install

  Write-Host ""
  Write-Host "Installed. Start the bot and open the setup dashboard:" -ForegroundColor Green
  Write-Host "1. .\scripts\start.ps1"
  Write-Host "2. http://127.0.0.1:8787"
  Write-Host "3. Keep AI_PROVIDER=codex or choose another brain per function"
  Write-Host "4. Paste TELEGRAM_BOT_TOKEN, SLACK_BOT_TOKEN, SLACK_APP_TOKEN, and optional AI keys"
  Write-Host ""
  Write-Host "Restart after saving tokens so the bot reloads .env." -ForegroundColor Cyan
}
finally {
  Pop-Location
}
