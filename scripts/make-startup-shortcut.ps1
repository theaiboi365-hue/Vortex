$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "Vortex.lnk"
$iconPath = Join-Path $projectRoot "assets\vortex-logo.ico"
$target = "powershell.exe"
$args = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$projectRoot\scripts\start-hidden.ps1`""

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.Arguments = $args
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = "Start Vortex in the background"
if (Test-Path -LiteralPath $iconPath) {
  $shortcut.IconLocation = $iconPath
}
$shortcut.WindowStyle = 7
$shortcut.Save()

Write-Host "Startup shortcut created: $shortcutPath" -ForegroundColor Green
