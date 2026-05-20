$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$dashboardUrl = "http://127.0.0.1:8787"
$logPath = Join-Path $projectRoot "bot-runtime.log"

function Test-Dashboard {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $dashboardUrl -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-Dashboard)) {
  Push-Location $projectRoot
  try {
    $arguments = "/c cd /d `"$projectRoot`" && npm.cmd start >> `"$logPath`" 2>&1"
    Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -WindowStyle Hidden

    for ($i = 0; $i -lt 12; $i++) {
      Start-Sleep -Milliseconds 500
      if (Test-Dashboard) { break }
    }
  }
  finally {
    Pop-Location
  }
}

Start-Process $dashboardUrl
