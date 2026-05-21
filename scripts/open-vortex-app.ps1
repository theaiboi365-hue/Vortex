$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$dashboardUrl = "http://127.0.0.1:8787"
$logPath = Join-Path $projectRoot "bot-runtime.log"

function Test-Dashboard {
  try {
    $response = Invoke-WebRequest -Uri $dashboardUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  }
  catch {
    return $false
  }
}

function Start-VortexHidden {
  $arguments = "/c cd /d `"$projectRoot`" && npm.cmd start >> `"$logPath`" 2>&1"
  Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -WindowStyle Hidden
}

function Open-DashboardApp {
  $edgePaths = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
  )

  $browserPath = $edgePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($browserPath) {
    Start-Process -FilePath $browserPath -ArgumentList "--app=$dashboardUrl"
    return
  }

  Start-Process $dashboardUrl
}

if (-not (Test-Dashboard)) {
  Start-VortexHidden
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Dashboard) { break }
  }
}

Open-DashboardApp
