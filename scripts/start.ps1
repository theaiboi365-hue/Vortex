$ErrorActionPreference = "Stop"
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
  npm.cmd start
}
finally {
  Pop-Location
}
