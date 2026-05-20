$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $projectRoot "bot-runtime.log"
$dashboardUrl = "http://127.0.0.1:8787"

function Test-Dashboard {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $dashboardUrl -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (Test-Dashboard) {
  Write-Host "Vortex is already running." -ForegroundColor Green
  Write-Host "Setup UI: $dashboardUrl" -ForegroundColor Cyan
  exit 0
}

Push-Location $projectRoot
try {
  $node = Get-Command npm.cmd -ErrorAction Stop
  $arguments = "/c cd /d `"$projectRoot`" && npm.cmd start >> `"$logPath`" 2>&1"
  Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -WindowStyle Hidden
  Write-Host "Vortex started in the background." -ForegroundColor Green
  Write-Host "Setup UI: http://127.0.0.1:8787" -ForegroundColor Cyan
  Write-Host "Log file: $logPath" -ForegroundColor Gray
}
finally {
  Pop-Location
}
