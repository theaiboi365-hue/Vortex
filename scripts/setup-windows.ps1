$ErrorActionPreference = "Stop"

$repoZipUrl = "https://github.com/theaiboi365-hue/Vortex/archive/refs/heads/main.zip"
$installRoot = Join-Path $env:LOCALAPPDATA "Vortex"
$appRoot = Join-Path $installRoot "app"
$zipPath = Join-Path $installRoot "Vortex-main.zip"
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

function Update-SessionPath {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

function Ensure-NodeRuntime {
  Update-SessionPath
  if ((Get-Command node -ErrorAction SilentlyContinue) -and (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    return
  }

  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is missing." -ForegroundColor Red
    Write-Host "Install Node.js 20+ from https://nodejs.org, then run this setup command again." -ForegroundColor Yellow
    exit 1
  }

  Write-Step "Installing Node.js LTS"
  winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
  Update-SessionPath

  if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js was installed, but this terminal has not picked it up yet." -ForegroundColor Yellow
    Write-Host "Close PowerShell, open it again, and run the same Vortex install command once more." -ForegroundColor Yellow
    exit 1
  }
}

function Copy-AppFiles($source, $destination) {
  New-Item -ItemType Directory -Force -Path $destination | Out-Null

  foreach ($dir in @(".github", "assets", "docs", "scripts", "src")) {
    $sourceDir = Join-Path $source $dir
    if (Test-Path -LiteralPath $sourceDir) {
      Copy-Item -LiteralPath $sourceDir -Destination $destination -Recurse -Force
    }
  }

  Get-ChildItem -LiteralPath $source -File -Force |
    Where-Object { $_.Name -ne ".env" } |
    ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $destination $_.Name) -Force
    }
}

function New-VortexIcon($projectRoot) {
  $iconPath = Join-Path $projectRoot "assets\vortex-logo.ico"
  if (Test-Path -LiteralPath $iconPath) { return $iconPath }

  Add-Type -AssemblyName System.Drawing
  $size = 256
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(8, 11, 14))

  $gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(19, 32, 42)), 1
  for ($x = 0; $x -le $size; $x += 38) { $g.DrawLine($gridPen, $x, 0, $x, $size) }
  for ($y = 0; $y -le $size; $y += 38) { $g.DrawLine($gridPen, 0, $y, $size, $y) }

  $circleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(16, 24, 32))
  $circlePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(45, 59, 69)), 4
  $g.FillEllipse($circleBrush, 32, 32, 192, 192)
  $g.DrawEllipse($circlePen, 32, 32, 192, 192)

  function P($x, $y) { New-Object System.Drawing.PointF $x, $y }
  $green = [System.Drawing.Color]::FromArgb(112, 227, 159)
  $cyan = [System.Drawing.Color]::FromArgb(107, 216, 255)
  $dark = [System.Drawing.Color]::FromArgb(18, 29, 36)
  $outer = @((P 128 38), (P 198 78), (P 198 158), (P 128 198), (P 58 158), (P 58 78))
  $inner = @((P 128 86), (P 162 105), (P 162 145), (P 128 164), (P 94 145), (P 94 105))
  $polyBrush = New-Object System.Drawing.SolidBrush $dark
  $greenPen = New-Object System.Drawing.Pen $green, 8
  $greenPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $greenPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $greenPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.FillPolygon($polyBrush, $outer)
  $g.DrawPolygon($greenPen, $outer)
  $cyanBrush = New-Object System.Drawing.SolidBrush $cyan
  $g.FillPolygon($cyanBrush, $inner)
  $g.DrawLine($greenPen, (P 58 158), (P 128 119))
  $g.DrawLine($greenPen, (P 128 119), (P 198 158))
  $g.DrawLine($greenPen, (P 128 119), (P 128 198))

  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $png = $ms.ToArray()
  $fs = [System.IO.File]::Create($iconPath)
  $bw = New-Object System.IO.BinaryWriter($fs)
  $bw.Write([UInt16]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]1)
  $bw.Write([Byte]0)
  $bw.Write([Byte]0)
  $bw.Write([Byte]0)
  $bw.Write([Byte]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]$png.Length)
  $bw.Write([UInt32]22)
  $bw.Write($png)
  $bw.Close()
  $fs.Close()
  $g.Dispose()
  $bmp.Dispose()

  return $iconPath
}

Write-Host ""
Write-Host "Vortex Windows setup" -ForegroundColor Green
Write-Host "This downloads Vortex, installs what it needs, creates the desktop app, and opens setup." -ForegroundColor Gray

Ensure-NodeRuntime

Write-Step "Preparing install folder"
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
if (Test-Path $extractRoot) { Remove-Item -LiteralPath $extractRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null

Write-Step "Downloading latest repo"
Invoke-WebRequest -Uri $repoZipUrl -OutFile $zipPath

Write-Step "Extracting files"
Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force
$downloadedRoot = Join-Path $extractRoot "Vortex-main"
if (-not (Test-Path $downloadedRoot)) {
  throw "Downloaded archive did not contain Vortex-main."
}

if (Test-Path $appRoot) {
  $existingEnv = Join-Path $appRoot ".env"
  Copy-AppFiles $downloadedRoot $appRoot
  if (Test-Path -LiteralPath $existingEnv) {
    Write-Host "Preserved existing .env tokens from previous install." -ForegroundColor Green
  }
} else {
  Move-Item -LiteralPath $downloadedRoot -Destination $appRoot
}

Write-Step "Creating .env"
Push-Location $appRoot
try {
  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
  }

  $iconPath = New-VortexIcon $appRoot

  Write-Step "Installing dependencies"
  npm.cmd install

  Write-Step "Creating startup automation"
  powershell.exe -ExecutionPolicy Bypass -File ".\scripts\make-startup-shortcut.ps1"

  Write-Step "Creating desktop launcher"
  $desktop = [Environment]::GetFolderPath("Desktop")
  $shortcutPath = Join-Path $desktop "Vortex.lnk"
  $startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Vortex"
  New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null
  $startMenuShortcutPath = Join-Path $startMenuDir "Vortex.lnk"
  $shell = New-Object -ComObject WScript.Shell
  foreach ($targetPath in @($shortcutPath, $startMenuShortcutPath)) {
    $shortcut = $shell.CreateShortcut($targetPath)
    $shortcut.TargetPath = "wscript.exe"
    $shortcut.Arguments = "`"$appRoot\scripts\launch.vbs`""
    $shortcut.WorkingDirectory = $appRoot
    $shortcut.Description = "Open Vortex"
    if (Test-Path -LiteralPath $iconPath) {
      $shortcut.IconLocation = $iconPath
    }
    $shortcut.WindowStyle = 7
    $shortcut.Save()
  }

  Write-Step "Starting bot in background"
  powershell.exe -ExecutionPolicy Bypass -File ".\scripts\start-hidden.ps1"

  Write-Step "Opening Vortex desktop app"
  Start-Process -FilePath "powershell.exe" -ArgumentList "-STA -NoProfile -ExecutionPolicy Bypass -File `"$appRoot\scripts\vortex-desktop.ps1`""

  Write-Host ""
  Write-Host "Done. Paste your Telegram token in the setup UI. Slack tokens are optional." -ForegroundColor Green
  Write-Host "Installed at: $appRoot" -ForegroundColor Gray
  Write-Host "Desktop app: Vortex shortcut" -ForegroundColor Cyan
  Write-Host "Web dashboard fallback: $dashboardUrl" -ForegroundColor Gray
  Write-Host "Desktop and Start Menu shortcuts were created as Vortex." -ForegroundColor Cyan
}
finally {
  Pop-Location
}
