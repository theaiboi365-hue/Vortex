$ErrorActionPreference = "Stop"

powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\vortex-desktop.ps1"
