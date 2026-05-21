$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$dashboardUrl = "http://127.0.0.1:8787"
$logPath = Join-Path $projectRoot "bot-runtime.log"

function Test-Dashboard {
  try {
    $response = Invoke-WebRequest -Uri "$dashboardUrl/api/status" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-Dashboard)) {
  $arguments = "/c cd /d `"$projectRoot`" && npm.cmd start >> `"$logPath`" 2>&1"
  Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -WindowStyle Hidden
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 400
    if (Test-Dashboard) { break }
  }
}

$browserPaths = @(
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

$browserPath = $browserPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($browserPath) {
  Start-Process -FilePath $browserPath -ArgumentList "--app=$dashboardUrl"
} else {
  Start-Process $dashboardUrl
}
