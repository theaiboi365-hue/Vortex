$ErrorActionPreference = "Stop"

$repoZipUrl = "https://github.com/theaiboi365-hue/codex-social-bridge/archive/refs/heads/main.zip"
$installRoot = Join-Path $env:LOCALAPPDATA "Vortex"
$appRoot = Join-Path $installRoot "app"
$zipPath = Join-Path $installRoot "codex-social-bridge-main.zip"
$extractRoot = Join-Path $installRoot "extract"
$dashboardUrl = "http://127.0.0.1:8787"

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Require-Command($name, $installHint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "$name is missing." -ForegroundColor Red
    Write-Host $installHint -ForegroundColor Yellow
    exit 1
  }
}

Write-Host ""
Write-Host "Vortex Windows setup" -ForegroundColor Green
Write-Host "This downloads the bot, installs dependencies, enables startup, and opens the setup UI." -ForegroundColor Gray

Require-Command "node" "Install Node.js 20+ from https://nodejs.org, then run this setup again."
Require-Command "npm.cmd" "Reinstall Node.js with npm enabled, then run this setup again."

Write-Step "Preparing install folder"
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
if (Test-Path $extractRoot) { Remove-Item -LiteralPath $extractRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null

Write-Step "Downloading latest repo"
Invoke-WebRequest -Uri $repoZipUrl -OutFile $zipPath

Write-Step "Extracting files"
Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force
$downloadedRoot = Join-Path $extractRoot "codex-social-bridge-main"
if (-not (Test-Path $downloadedRoot)) {
  throw "Downloaded archive did not contain codex-social-bridge-main."
}

if (Test-Path $appRoot) {
  $backupRoot = Join-Path $installRoot ("backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  Move-Item -LiteralPath $appRoot -Destination $backupRoot
  Write-Host "Previous install backed up to: $backupRoot" -ForegroundColor Gray
}
Move-Item -LiteralPath $downloadedRoot -Destination $appRoot

if ($backupRoot -and (Test-Path (Join-Path $backupRoot ".env"))) {
  Copy-Item -LiteralPath (Join-Path $backupRoot ".env") -Destination (Join-Path $appRoot ".env") -Force
  Write-Host "Preserved existing .env tokens from previous install." -ForegroundColor Green
}

Write-Step "Creating .env"
Push-Location $appRoot
try {
  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
  }

  Write-Step "Installing dependencies"
  npm.cmd install

  Write-Step "Creating startup automation"
  powershell.exe -ExecutionPolicy Bypass -File ".\scripts\make-startup-shortcut.ps1"

  Write-Step "Creating desktop launcher"
  $desktop = [Environment]::GetFolderPath("Desktop")
  $shortcutPath = Join-Path $desktop "Vortex.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = "powershell.exe"
  $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$appRoot\scripts\start.ps1`""
  $shortcut.WorkingDirectory = $appRoot
  $shortcut.WindowStyle = 1
  $shortcut.Save()

  Write-Step "Starting bot in background"
  powershell.exe -ExecutionPolicy Bypass -File ".\scripts\start-hidden.ps1"

  Write-Step "Opening setup UI"
  Start-Process $dashboardUrl

  Write-Host ""
  Write-Host "Done. Paste your Telegram, Slack, and AI tokens in the setup UI." -ForegroundColor Green
  Write-Host "Installed at: $appRoot" -ForegroundColor Gray
  Write-Host "Dashboard: $dashboardUrl" -ForegroundColor Cyan
}
finally {
  Pop-Location
}
