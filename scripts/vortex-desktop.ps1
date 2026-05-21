$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$dashboardUrl = "http://127.0.0.1:8787"
$logPath = Join-Path $projectRoot "bot-runtime.log"
$iconPath = Join-Path $projectRoot "assets\vortex-logo.ico"

$colors = @{
  Bg = [System.Drawing.Color]::FromArgb(7, 10, 13)
  Panel = [System.Drawing.Color]::FromArgb(12, 17, 22)
  Panel2 = [System.Drawing.Color]::FromArgb(17, 24, 31)
  Line = [System.Drawing.Color]::FromArgb(38, 48, 58)
  Text = [System.Drawing.Color]::FromArgb(233, 240, 246)
  Muted = [System.Drawing.Color]::FromArgb(150, 164, 178)
  Green = [System.Drawing.Color]::FromArgb(112, 227, 159)
  Blue = [System.Drawing.Color]::FromArgb(107, 216, 255)
  Amber = [System.Drawing.Color]::FromArgb(255, 197, 117)
  Red = [System.Drawing.Color]::FromArgb(255, 118, 118)
}

function Test-Vortex {
  try {
    $response = Invoke-WebRequest -Uri "$dashboardUrl/api/status" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Start-VortexServer {
  if (Test-Vortex) { return }
  $arguments = "/c cd /d `"$projectRoot`" && npm.cmd start >> `"$logPath`" 2>&1"
  Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -WindowStyle Hidden
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 400
    if (Test-Vortex) { return }
  }
}

function Restart-VortexServer {
  $matches = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -like "*$projectRoot*" -or $_.CommandLine -like "*src/index.js*" }
  foreach ($process in $matches) {
    Stop-Process -Id $process.ProcessId -Force
  }
  Start-Sleep -Milliseconds 600
  Start-VortexServer
}

function Invoke-VortexApi($path, $method = "GET", $body = $null) {
  $params = @{
    Uri = "$dashboardUrl$path"
    Method = $method
    TimeoutSec = 20
    UseBasicParsing = $true
  }
  if ($null -ne $body) {
    $params.ContentType = "application/json"
    $params.Body = ($body | ConvertTo-Json -Depth 5)
  }
  return Invoke-RestMethod @params
}

function Font($size, $style = [System.Drawing.FontStyle]::Regular) {
  return New-Object System.Drawing.Font("Segoe UI", $size, $style)
}

function New-Button($text, $accent = $false) {
  $button = New-Object System.Windows.Forms.Button
  $button.Text = $text
  $button.Height = 38
  $button.Width = 148
  $button.FlatStyle = "Flat"
  $button.FlatAppearance.BorderSize = 1
  $button.FlatAppearance.BorderColor = if ($accent) { $colors.Green } else { $colors.Line }
  $button.BackColor = if ($accent) { $colors.Green } else { $colors.Panel2 }
  $button.ForeColor = if ($accent) { [System.Drawing.Color]::FromArgb(5, 9, 10) } else { $colors.Text }
  $button.Font = Font 9 ([System.Drawing.FontStyle]::Bold)
  $button.Margin = New-Object System.Windows.Forms.Padding(0, 0, 10, 10)
  return $button
}

function New-TextBox($name, $password = $false, $wide = $true) {
  $box = New-Object System.Windows.Forms.TextBox
  $box.Name = $name
  $box.Width = if ($wide) { 390 } else { 300 }
  $box.Height = 30
  $box.BorderStyle = "FixedSingle"
  $box.BackColor = [System.Drawing.Color]::FromArgb(9, 14, 18)
  $box.ForeColor = $colors.Text
  $box.Font = Font 9
  if ($password) { $box.UseSystemPasswordChar = $true }
  return $box
}

function New-Combo($name, [string[]]$items) {
  $combo = New-Object System.Windows.Forms.ComboBox
  $combo.Name = $name
  $combo.Width = 390
  $combo.Height = 30
  $combo.DropDownStyle = "DropDown"
  $combo.AutoCompleteMode = "SuggestAppend"
  $combo.AutoCompleteSource = "ListItems"
  $combo.BackColor = [System.Drawing.Color]::FromArgb(9, 14, 18)
  $combo.ForeColor = $colors.Text
  $combo.Font = Font 9
  [void]$combo.Items.AddRange($items)
  return $combo
}

function New-Card($title, $subtitle = "") {
  $card = New-Object System.Windows.Forms.Panel
  $card.Width = 940
  $card.AutoSize = $true
  $card.BackColor = $colors.Panel
  $card.Padding = New-Object System.Windows.Forms.Padding(18)
  $card.Margin = New-Object System.Windows.Forms.Padding(0, 0, 0, 14)

  $heading = New-Object System.Windows.Forms.Label
  $heading.Text = $title
  $heading.Font = Font 13 ([System.Drawing.FontStyle]::Bold)
  $heading.ForeColor = $colors.Text
  $heading.AutoSize = $true
  $heading.Margin = New-Object System.Windows.Forms.Padding(0, 0, 0, 2)
  [void]$card.Controls.Add($heading)

  if ($subtitle) {
    $copy = New-Object System.Windows.Forms.Label
    $copy.Text = $subtitle
    $copy.Font = Font 9
    $copy.ForeColor = $colors.Muted
    $copy.AutoSize = $true
    $copy.MaximumSize = New-Object System.Drawing.Size(700, 0)
    $copy.Location = New-Object System.Drawing.Point(18, 46)
    [void]$card.Controls.Add($copy)
    $card.Height = 88
  } else {
    $card.Height = 58
  }
  return $card
}

function Add-Field($parent, $labelText, $control, $x, $y) {
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $labelText
  $label.Font = Font 8.5 ([System.Drawing.FontStyle]::Bold)
  $label.ForeColor = $colors.Muted
  $label.AutoSize = $true
  $label.Location = New-Object System.Drawing.Point($x, $y)
  [void]$parent.Controls.Add($label)

  $control.Location = New-Object System.Drawing.Point($x, ($y + 22))
  [void]$parent.Controls.Add($control)
}

Start-VortexServer

$providers = @("codex", "anthropic", "openai", "gemini", "ollama")
$codexModels = @("", "gpt-5.3-codex", "gpt-5.2-codex", "gpt-5.1-codex", "gpt-5-codex", "gpt-5.5", "gpt-5.4", "gpt-5.2", "gpt-5.1", "gpt-5", "gpt-4.1", "gpt-4o", "o3", "o3-pro", "o4-mini")
$claudeModels = @("claude-opus-4-1-20250805", "claude-opus-4-20250514", "claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-20240229", "claude-3-haiku-20240307")
$openAiModels = @("gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-5.2-pro", "gpt-5.1", "gpt-5.1-pro", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o3", "o3-pro", "o4-mini", "gpt-realtime", "gpt-audio")
$geminiModels = @("gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash")
$ollamaModels = @("gemma3:270m", "gemma3:1b", "gemma3:4b", "llama3.2", "llama3.2:1b", "llama3.2:3b", "mistral", "mixtral", "qwen2.5:0.5b", "qwen2.5:1.5b", "qwen2.5:7b", "deepseek-r1:1.5b", "deepseek-r1:7b", "phi4", "phi3:mini", "codellama")

$controls = @{}
$navButtons = @{}

$form = New-Object System.Windows.Forms.Form
$form.Text = "Vortex"
$form.Size = New-Object System.Drawing.Size(1240, 740)
$form.MinimumSize = New-Object System.Drawing.Size(1080, 660)
$form.StartPosition = "CenterScreen"
$form.BackColor = $colors.Bg
$form.ForeColor = $colors.Text
$form.TopMost = $true
if (Test-Path -LiteralPath $iconPath) { $form.Icon = New-Object System.Drawing.Icon($iconPath) }

$root = New-Object System.Windows.Forms.TableLayoutPanel
$root.Dock = "Fill"
$root.ColumnCount = 2
$root.RowCount = 1
$root.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Absolute, 220))) | Out-Null
$root.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 100))) | Out-Null
$form.Controls.Add($root)

$sidebar = New-Object System.Windows.Forms.Panel
$sidebar.Dock = "Fill"
$sidebar.BackColor = [System.Drawing.Color]::FromArgb(5, 8, 11)
$sidebar.Padding = New-Object System.Windows.Forms.Padding(18)
$root.Controls.Add($sidebar, 0, 0)

$brand = New-Object System.Windows.Forms.Label
$brand.Text = "Vortex"
$brand.Font = Font 24 ([System.Drawing.FontStyle]::Bold)
$brand.ForeColor = $colors.Green
$brand.Location = New-Object System.Drawing.Point(18, 20)
$brand.AutoSize = $true
$sidebar.Controls.Add($brand)

$tag = New-Object System.Windows.Forms.Label
$tag.Text = "Local AI cockpit"
$tag.Font = Font 9
$tag.ForeColor = $colors.Muted
$tag.Location = New-Object System.Drawing.Point(21, 64)
$tag.AutoSize = $true
$sidebar.Controls.Add($tag)

$statusPill = New-Object System.Windows.Forms.Label
$statusPill.Text = "Starting"
$statusPill.Font = Font 9 ([System.Drawing.FontStyle]::Bold)
$statusPill.ForeColor = $colors.Amber
$statusPill.Location = New-Object System.Drawing.Point(22, 100)
$statusPill.AutoSize = $true
$sidebar.Controls.Add($statusPill)

function Add-Nav($key, $text, $top) {
  $button = New-Object System.Windows.Forms.Button
  $button.Text = $text
  $button.Width = 180
  $button.Height = 42
  $button.Location = New-Object System.Drawing.Point(18, $top)
  $button.TextAlign = "MiddleLeft"
  $button.FlatStyle = "Flat"
  $button.FlatAppearance.BorderSize = 0
  $button.BackColor = $colors.Panel
  $button.ForeColor = $colors.Text
  $button.Font = Font 10 ([System.Drawing.FontStyle]::Bold)
  $button.Add_Click({ Show-Page $key }.GetNewClosure())
  $navButtons[$key] = $button
  $sidebar.Controls.Add($button)
}

Add-Nav "chat" "  Chat" 155
Add-Nav "channels" "  Channels" 205
Add-Nav "models" "  Models" 255
Add-Nav "agent" "  Safety" 305
Add-Nav "logs" "  Logs" 355

$hint = New-Object System.Windows.Forms.Label
$hint.Text = "Telegram and Slack are optional. Start by chatting here."
$hint.Font = Font 8.5
$hint.ForeColor = $colors.Muted
$hint.MaximumSize = New-Object System.Drawing.Size(175, 0)
$hint.AutoSize = $true
$hint.Location = New-Object System.Drawing.Point(22, 630)
$sidebar.Controls.Add($hint)

$main = New-Object System.Windows.Forms.Panel
$main.Dock = "Fill"
$main.BackColor = $colors.Bg
$main.Padding = New-Object System.Windows.Forms.Padding(28)
$root.Controls.Add($main, 1, 0)

function Clear-Main {
  $main.Controls.Clear()
}

function Add-Title($title, $subtitle) {
  $heading = New-Object System.Windows.Forms.Label
  $heading.Text = $title
  $heading.Font = Font 22 ([System.Drawing.FontStyle]::Bold)
  $heading.ForeColor = $colors.Text
  $heading.Location = New-Object System.Drawing.Point(28, 24)
  $heading.AutoSize = $true
  $main.Controls.Add($heading)

  $copy = New-Object System.Windows.Forms.Label
  $copy.Text = $subtitle
  $copy.Font = Font 10
  $copy.ForeColor = $colors.Muted
  $copy.Location = New-Object System.Drawing.Point(31, 66)
  $copy.AutoSize = $true
  $copy.MaximumSize = New-Object System.Drawing.Size(760, 0)
  $main.Controls.Add($copy)
}

function Set-Nav($active) {
  foreach ($key in $navButtons.Keys) {
    $navButtons[$key].BackColor = if ($key -eq $active) { [System.Drawing.Color]::FromArgb(23, 36, 44) } else { $colors.Panel }
    $navButtons[$key].ForeColor = if ($key -eq $active) { $colors.Green } else { $colors.Text }
  }
}

function Load-VortexData {
  Start-VortexServer
  $currentStatus = Invoke-VortexApi "/api/status"
  $envValues = Invoke-VortexApi "/api/env"
  foreach ($key in $controls.Keys) {
    $value = [string]($envValues.$key)
    $controls[$key].Text = $value
  }
  $statusPill.Text = "Running | " + $currentStatus.brain.provider
  $statusPill.ForeColor = $colors.Green
}

function Save-VortexData {
  $values = @{}
  foreach ($key in $controls.Keys) {
    $values[$key] = $controls[$key].Text
  }
  Invoke-VortexApi "/api/env" "POST" $values | Out-Null
  $statusPill.Text = "Saved. Restart bot."
  $statusPill.ForeColor = $colors.Blue
}

function Add-Actions($top) {
  $save = New-Button "Save" $true
  $save.Location = New-Object System.Drawing.Point(32, $top)
  $save.Add_Click({
    try { Save-VortexData } catch { Show-Error $_.Exception.Message }
  })
  $main.Controls.Add($save)

  $restart = New-Button "Restart Bot"
  $restart.Location = New-Object System.Drawing.Point(190, $top)
  $restart.Add_Click({
    try {
      $statusPill.Text = "Restarting..."
      $statusPill.ForeColor = $colors.Amber
      Restart-VortexServer
      Load-VortexData
    } catch { Show-Error $_.Exception.Message }
  })
  $main.Controls.Add($restart)
}

function Show-Error($message) {
  [System.Windows.Forms.MessageBox]::Show($message, "Vortex", "OK", "Error") | Out-Null
}

function Show-Chat {
  Clear-Main
  Set-Nav "chat"
  Add-Title "Chat" "Use Vortex immediately. Add Telegram or Slack later only if you want messages delivered there."

  $transcript = New-Object System.Windows.Forms.TextBox
  $transcript.Multiline = $true
  $transcript.ReadOnly = $true
  $transcript.ScrollBars = "Vertical"
  $transcript.Location = New-Object System.Drawing.Point(32, 112)
  $transcript.Size = New-Object System.Drawing.Size(900, 390)
  $transcript.BorderStyle = "FixedSingle"
  $transcript.BackColor = $colors.Panel
  $transcript.ForeColor = $colors.Text
  $transcript.Font = Font 10
  $transcript.Text = "Vortex: Installed and ready. Type below to test the agent locally."
  $main.Controls.Add($transcript)

  $input = New-Object System.Windows.Forms.TextBox
  $input.Location = New-Object System.Drawing.Point(32, 520)
  $input.Size = New-Object System.Drawing.Size(760, 34)
  $input.BorderStyle = "FixedSingle"
  $input.BackColor = [System.Drawing.Color]::FromArgb(9, 14, 18)
  $input.ForeColor = $colors.Text
  $input.Font = Font 10
  $main.Controls.Add($input)

  $send = New-Button "Send" $true
  $send.Location = New-Object System.Drawing.Point(808, 516)
  $main.Controls.Add($send)

  $sendAction = {
    $text = $input.Text.Trim()
    if (-not $text) { return }
    $transcript.AppendText("`r`n`r`nYou: $text")
    $input.Text = ""
    $send.Enabled = $false
    $send.Text = "Thinking..."
    try {
      $reply = Invoke-VortexApi "/api/chat" "POST" @{ text = $text }
      $transcript.AppendText("`r`n`r`nVortex: " + [string]$reply.answer)
    } catch {
      $transcript.AppendText("`r`n`r`nVortex: " + $_.Exception.Message)
    } finally {
      $send.Text = "Send"
      $send.Enabled = $true
    }
  }
  $send.Add_Click($sendAction)
  $input.Add_KeyDown({
    if ($_.KeyCode -eq "Enter") {
      $_.SuppressKeyPress = $true
      & $sendAction
    }
  })
}

function Show-Channels {
  Clear-Main
  Set-Nav "channels"
  Add-Title "Channels" "Local chat works now. Telegram and Slack are optional delivery channels."

  $card = New-Card "Messaging setup" "Leave these blank unless you want Vortex to send and receive messages through Telegram or Slack."
  $card.Location = New-Object System.Drawing.Point(32, 112)
  $card.Height = 440
  $main.Controls.Add($card)

  $controls.BOT_NAME = New-TextBox "BOT_NAME"
  Add-Field $card "Bot name" $controls.BOT_NAME 18 92
  $controls.TELEGRAM_BOT_TOKEN = New-TextBox "TELEGRAM_BOT_TOKEN" $true
  Add-Field $card "Telegram bot token (optional)" $controls.TELEGRAM_BOT_TOKEN 18 158
  $controls.TELEGRAM_ALLOWED_USER_IDS = New-TextBox "TELEGRAM_ALLOWED_USER_IDS"
  Add-Field $card "Telegram allowed user IDs (optional)" $controls.TELEGRAM_ALLOWED_USER_IDS 18 224
  $controls.SLACK_BOT_TOKEN = New-TextBox "SLACK_BOT_TOKEN" $true
  Add-Field $card "Slack bot token (optional)" $controls.SLACK_BOT_TOKEN 18 290
  $controls.SLACK_APP_TOKEN = New-TextBox "SLACK_APP_TOKEN" $true
  Add-Field $card "Slack app token (optional)" $controls.SLACK_APP_TOKEN 18 356

  Add-Actions 574
  Load-VortexData
}

function Show-Models {
  Clear-Main
  Set-Nav "models"
  Add-Title "Models" "Choose the brain per surface. Keys are only needed for providers you actually use."

  $card = New-Card "Routing and models" "Codex is default. You can type any new model name if it is not in the list."
  $card.Location = New-Object System.Drawing.Point(32, 112)
  $card.Height = 500
  $main.Controls.Add($card)

  $controls.AI_PROVIDER = New-Combo "AI_PROVIDER" $providers
  Add-Field $card "Default brain" $controls.AI_PROVIDER 18 92
  $controls.SLACK_AI_PROVIDER = New-Combo "SLACK_AI_PROVIDER" (@("") + $providers)
  Add-Field $card "Slack brain override" $controls.SLACK_AI_PROVIDER 18 158
  $controls.TELEGRAM_AI_PROVIDER = New-Combo "TELEGRAM_AI_PROVIDER" (@("") + $providers)
  Add-Field $card "Telegram brain override" $controls.TELEGRAM_AI_PROVIDER 18 224
  $controls.CODEX_COMMAND = New-TextBox "CODEX_COMMAND"
  Add-Field $card "Codex command" $controls.CODEX_COMMAND 18 290
  $controls.CODEX_MODEL = New-Combo "CODEX_MODEL" $codexModels
  Add-Field $card "Codex model" $controls.CODEX_MODEL 18 356
  $controls.CODEX_EXTRA_ARGS = New-TextBox "CODEX_EXTRA_ARGS"
  Add-Field $card "Codex extra args" $controls.CODEX_EXTRA_ARGS 18 422

  $controls.CLAUDE_MODEL = New-Combo "CLAUDE_MODEL" $claudeModels
  Add-Field $card "Claude model" $controls.CLAUDE_MODEL 500 92
  $controls.OPENAI_MODEL = New-Combo "OPENAI_MODEL" $openAiModels
  Add-Field $card "OpenAI model" $controls.OPENAI_MODEL 500 158
  $controls.GEMINI_MODEL = New-Combo "GEMINI_MODEL" $geminiModels
  Add-Field $card "Gemini model" $controls.GEMINI_MODEL 500 224
  $controls.OLLAMA_MODEL = New-Combo "OLLAMA_MODEL" $ollamaModels
  Add-Field $card "Ollama model" $controls.OLLAMA_MODEL 500 290
  $controls.OPENAI_BASE_URL = New-TextBox "OPENAI_BASE_URL"
  Add-Field $card "OpenAI-compatible base URL" $controls.OPENAI_BASE_URL 500 356
  $controls.OLLAMA_BASE_URL = New-TextBox "OLLAMA_BASE_URL"
  Add-Field $card "Ollama base URL" $controls.OLLAMA_BASE_URL 500 422

  Add-Actions 634
  Load-VortexData
}

function Show-Agent {
  Clear-Main
  Set-Nav "agent"
  Add-Title "Safety" "Vortex can expose safe agent commands, but it should only act when the user explicitly asks."

  $card = New-Card "Keys and safety" "Banking/payment actions, secrets, private data leaks, and data-breach requests stay blocked."
  $card.Location = New-Object System.Drawing.Point(32, 112)
  $card.Height = 500
  $main.Controls.Add($card)

  $controls.ANTHROPIC_API_KEY = New-TextBox "ANTHROPIC_API_KEY" $true
  Add-Field $card "Anthropic API key (only if Claude selected)" $controls.ANTHROPIC_API_KEY 18 92
  $controls.OPENAI_API_KEY = New-TextBox "OPENAI_API_KEY" $true
  Add-Field $card "OpenAI API key (only if OpenAI selected)" $controls.OPENAI_API_KEY 18 158
  $controls.GOOGLE_API_KEY = New-TextBox "GOOGLE_API_KEY" $true
  Add-Field $card "Google API key (only if Gemini selected)" $controls.GOOGLE_API_KEY 18 224
  $controls.ENABLE_AGENT_TOOLS = New-Combo "ENABLE_AGENT_TOOLS" @("true", "false")
  Add-Field $card "Agent tools" $controls.ENABLE_AGENT_TOOLS 18 290
  $controls.AGENT_SAFE_MODE = New-Combo "AGENT_SAFE_MODE" @("true", "false")
  Add-Field $card "Safe mode" $controls.AGENT_SAFE_MODE 18 356
  $controls.AGENT_ALLOWED_CHANNELS = New-TextBox "AGENT_ALLOWED_CHANNELS"
  Add-Field $card "Allowed Slack channels" $controls.AGENT_ALLOWED_CHANNELS 18 422

  $controls.SYSTEM_PROMPT = New-Object System.Windows.Forms.TextBox
  $controls.SYSTEM_PROMPT.Name = "SYSTEM_PROMPT"
  $controls.SYSTEM_PROMPT.Multiline = $true
  $controls.SYSTEM_PROMPT.Width = 430
  $controls.SYSTEM_PROMPT.Height = 220
  $controls.SYSTEM_PROMPT.BackColor = [System.Drawing.Color]::FromArgb(9, 14, 18)
  $controls.SYSTEM_PROMPT.ForeColor = $colors.Text
  Add-Field $card "System prompt" $controls.SYSTEM_PROMPT 500 92

  $controls.DASHBOARD_PORT = New-TextBox "DASHBOARD_PORT"
  Add-Field $card "Dashboard port" $controls.DASHBOARD_PORT 500 356

  Add-Actions 634
  Load-VortexData
}

function Show-Logs {
  Clear-Main
  Set-Nav "logs"
  Add-Title "Logs" "Use this only when something is not replying or the app needs debugging."

  $box = New-Object System.Windows.Forms.TextBox
  $box.Multiline = $true
  $box.ReadOnly = $true
  $box.ScrollBars = "Vertical"
  $box.Location = New-Object System.Drawing.Point(32, 112)
  $box.Size = New-Object System.Drawing.Size(900, 430)
  $box.BackColor = $colors.Panel
  $box.ForeColor = $colors.Text
  $box.Font = New-Object System.Drawing.Font("Consolas", 9)
  if (Test-Path -LiteralPath $logPath) {
    $box.Text = (Get-Content -LiteralPath $logPath -Tail 160) -join "`r`n"
  } else {
    $box.Text = "No log file yet."
  }
  $main.Controls.Add($box)

  $refresh = New-Button "Refresh"
  $refresh.Location = New-Object System.Drawing.Point(32, 570)
  $refresh.Add_Click({ Show-Logs })
  $main.Controls.Add($refresh)

  $open = New-Button "Open Log"
  $open.Location = New-Object System.Drawing.Point(190, 570)
  $open.Add_Click({ if (Test-Path -LiteralPath $logPath) { Start-Process notepad.exe $logPath } })
  $main.Controls.Add($open)

  $web = New-Button "Web UI"
  $web.Location = New-Object System.Drawing.Point(348, 570)
  $web.Add_Click({ Start-Process $dashboardUrl })
  $main.Controls.Add($web)
}

function Show-Page($key) {
  try {
    if ($key -eq "chat") { Show-Chat; return }
    if ($key -eq "channels") { Show-Channels; return }
    if ($key -eq "models") { Show-Models; return }
    if ($key -eq "agent") { Show-Agent; return }
    if ($key -eq "logs") { Show-Logs; return }
  } catch {
    Show-Error $_.Exception.Message
  }
}

$form.Add_Shown({
  $form.Activate()
  $form.BringToFront()
  Show-Chat
  try { Load-VortexData } catch {}
  $form.TopMost = $false
})

[void]$form.ShowDialog()
