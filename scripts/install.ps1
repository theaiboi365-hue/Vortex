$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Claude Social Bridge installer" -ForegroundColor Cyan
Write-Host "This installs dependencies and prepares your .env file." -ForegroundColor Gray
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
  Write-Host "Installed. Now open .env and add:" -ForegroundColor Green
  Write-Host "1. ANTHROPIC_API_KEY"
  Write-Host "2. SLACK_BOT_TOKEN + SLACK_APP_TOKEN for Slack"
  Write-Host "3. TELEGRAM_BOT_TOKEN from BotFather for Telegram"
  Write-Host ""
  Write-Host "Then run: .\scripts\start.ps1" -ForegroundColor Cyan
}
finally {
  Pop-Location
}
