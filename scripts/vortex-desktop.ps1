$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$dashboardUrl = "http://127.0.0.1:8787"
$logPath = Join-Path $projectRoot "bot-runtime.log"
$iconPath = Join-Path $projectRoot "assets\vortex-logo.ico"

function Test-Vortex {
  try {
    $response = Invoke-WebRequest -Uri "$dashboardUrl/api/status" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  }
  catch {
    return $false
  }
}

function Start-VortexServer {
  if (Test-Vortex) { return }
  $arguments = "/c cd /d `"$projectRoot`" && npm.cmd start >> `"$logPath`" 2>&1"
  Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -WindowStyle Hidden
  for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Vortex) { return }
  }
}

function Restart-VortexServer {
  $matches = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -like "*$projectRoot*" -or $_.CommandLine -like "*src/index.js*" }
  foreach ($process in $matches) {
    Stop-Process -Id $process.ProcessId -Force
  }
  Start-Sleep -Milliseconds 500
  Start-VortexServer
}

function Invoke-VortexApi($path, $method = "GET", $body = $null) {
  $params = @{
    Uri = "$dashboardUrl$path"
    Method = $method
    TimeoutSec = 8
    UseBasicParsing = $true
  }
  if ($null -ne $body) {
    $params.ContentType = "application/json"
    $params.Body = ($body | ConvertTo-Json -Depth 4)
  }
  return Invoke-RestMethod @params
}

function New-Label($text) {
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $text
  $label.ForeColor = [System.Drawing.Color]::FromArgb(202, 211, 221)
  $label.AutoSize = $true
  $label.Margin = New-Object System.Windows.Forms.Padding(0, 8, 0, 4)
  return $label
}

function New-Input($name, $password = $false) {
  $box = New-Object System.Windows.Forms.TextBox
  $box.Name = $name
  $box.Width = 330
  $box.Height = 26
  $box.BorderStyle = "FixedSingle"
  $box.BackColor = [System.Drawing.Color]::FromArgb(14, 20, 26)
  $box.ForeColor = [System.Drawing.Color]::White
  if ($password) { $box.UseSystemPasswordChar = $true }
  return $box
}

function New-Combo($name, [string[]]$items) {
  $combo = New-Object System.Windows.Forms.ComboBox
  $combo.Name = $name
  $combo.Width = 330
  $combo.DropDownStyle = "DropDown"
  $combo.AutoCompleteMode = "SuggestAppend"
  $combo.AutoCompleteSource = "ListItems"
  $combo.BackColor = [System.Drawing.Color]::FromArgb(14, 20, 26)
  $combo.ForeColor = [System.Drawing.Color]::White
  [void]$combo.Items.AddRange($items)
  return $combo
}

function Add-Field($panel, $labelText, $control) {
  [void]$panel.Controls.Add((New-Label $labelText))
  [void]$panel.Controls.Add($control)
}

Start-VortexServer

$providers = @("codex", "anthropic", "openai", "gemini", "ollama")
$codexModels = @("", "gpt-5.3-codex", "gpt-5.2-codex", "gpt-5.1-codex", "gpt-5-codex", "gpt-5.1-codex-mini", "gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-5.2-pro", "gpt-5.1", "gpt-5.1-pro", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini", "o3", "o3-pro", "o4-mini")
$claudeModels = @("claude-opus-4-1-20250805", "claude-opus-4-20250514", "claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307")
$openAiModels = @("gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-5.2-pro", "gpt-5.1", "gpt-5.1-pro", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o3", "o3-pro", "o4-mini", "o1", "o1-pro", "gpt-realtime", "gpt-realtime-mini", "gpt-audio", "gpt-audio-mini")
$geminiModels = @("gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-3-pro-image-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-preview-image-generation", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b")
$ollamaModels = @("gemma3:270m", "gemma3:1b", "gemma3:4b", "gemma3:12b", "llama3.2", "llama3.2:1b", "llama3.2:3b", "llama3.1:8b", "mistral", "mixtral", "qwen2.5:0.5b", "qwen2.5:1.5b", "qwen2.5:7b", "deepseek-r1:1.5b", "deepseek-r1:7b", "phi4", "phi3:mini", "codellama")

$form = New-Object System.Windows.Forms.Form
$form.Text = "Vortex"
$form.Size = New-Object System.Drawing.Size(980, 720)
$form.MinimumSize = New-Object System.Drawing.Size(860, 620)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::FromArgb(8, 11, 14)
$form.ForeColor = [System.Drawing.Color]::White
$form.TopMost = $true
if (Test-Path -LiteralPath $iconPath) { $form.Icon = New-Object System.Drawing.Icon($iconPath) }

$header = New-Object System.Windows.Forms.Panel
$header.Dock = "Top"
$header.Height = 92
$header.BackColor = [System.Drawing.Color]::FromArgb(11, 16, 20)
$form.Controls.Add($header)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Vortex"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 25, [System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::FromArgb(112, 227, 159)
$title.Location = New-Object System.Drawing.Point(22, 14)
$title.AutoSize = $true
$header.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Native Windows control center for Slack, Telegram, Codex, Claude, Gemini, OpenAI, and local models."
$subtitle.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(164, 176, 188)
$subtitle.Location = New-Object System.Drawing.Point(26, 58)
$subtitle.AutoSize = $true
$header.Controls.Add($subtitle)

$status = New-Object System.Windows.Forms.Label
$status.Text = "Starting..."
$status.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$status.ForeColor = [System.Drawing.Color]::FromArgb(107, 216, 255)
$status.Location = New-Object System.Drawing.Point(760, 34)
$status.AutoSize = $true
$header.Controls.Add($status)

$tabs = New-Object System.Windows.Forms.TabControl
$tabs.Dock = "Fill"
$tabs.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Controls.Add($tabs)

$controls = @{}

function New-TabPage($name) {
  $page = New-Object System.Windows.Forms.TabPage
  $page.Text = $name
  $page.BackColor = [System.Drawing.Color]::FromArgb(8, 11, 14)
  $page.ForeColor = [System.Drawing.Color]::White
  $panel = New-Object System.Windows.Forms.FlowLayoutPanel
  $panel.Dock = "Fill"
  $panel.AutoScroll = $true
  $panel.FlowDirection = "TopDown"
  $panel.WrapContents = $false
  $panel.Padding = New-Object System.Windows.Forms.Padding(20)
  $page.Controls.Add($panel)
  [void]$tabs.TabPages.Add($page)
  return $panel
}

$chatPanel = New-TabPage "Chat"
$mainPanel = New-TabPage "Setup"
$brainPanel = New-TabPage "Models"
$tokenPanel = New-TabPage "Tokens"
$agentPanel = New-TabPage "Agent"
$usePanel = New-TabPage "Use"

$chatOutput = New-Object System.Windows.Forms.TextBox
$chatOutput.Multiline = $true
$chatOutput.ReadOnly = $true
$chatOutput.ScrollBars = "Vertical"
$chatOutput.Width = 820
$chatOutput.Height = 340
$chatOutput.BackColor = [System.Drawing.Color]::FromArgb(14, 20, 26)
$chatOutput.ForeColor = [System.Drawing.Color]::White
$chatOutput.Text = "Vortex is installed. Type a message below. Telegram and Slack are optional."
[void]$chatPanel.Controls.Add($chatOutput)

$chatInput = New-Object System.Windows.Forms.TextBox
$chatInput.Width = 680
$chatInput.Height = 30
$chatInput.BackColor = [System.Drawing.Color]::FromArgb(14, 20, 26)
$chatInput.ForeColor = [System.Drawing.Color]::White
[void]$chatPanel.Controls.Add($chatInput)

$sendChatButton = New-Object System.Windows.Forms.Button
$sendChatButton.Text = "Send"
$sendChatButton.Width = 120
$sendChatButton.Height = 30
$sendChatButton.BackColor = [System.Drawing.Color]::FromArgb(112, 227, 159)
$sendChatButton.ForeColor = [System.Drawing.Color]::FromArgb(5, 9, 10)
$sendChatButton.FlatStyle = "Flat"
[void]$chatPanel.Controls.Add($sendChatButton)

$controls.BOT_NAME = New-Input "BOT_NAME"
Add-Field $mainPanel "Bot name" $controls.BOT_NAME
$controls.AI_PROVIDER = New-Combo "AI_PROVIDER" $providers
Add-Field $mainPanel "Default AI brain" $controls.AI_PROVIDER
$controls.SLACK_AI_PROVIDER = New-Combo "SLACK_AI_PROVIDER" (@("") + $providers)
Add-Field $mainPanel "Slack AI brain" $controls.SLACK_AI_PROVIDER
$controls.TELEGRAM_AI_PROVIDER = New-Combo "TELEGRAM_AI_PROVIDER" (@("") + $providers)
Add-Field $mainPanel "Telegram AI brain" $controls.TELEGRAM_AI_PROVIDER
$controls.DASHBOARD_PORT = New-Input "DASHBOARD_PORT"
Add-Field $mainPanel "Dashboard port" $controls.DASHBOARD_PORT

$controls.CODEX_COMMAND = New-Input "CODEX_COMMAND"
Add-Field $brainPanel "Codex command" $controls.CODEX_COMMAND
$controls.CODEX_MODEL = New-Combo "CODEX_MODEL" $codexModels
Add-Field $brainPanel "Codex model" $controls.CODEX_MODEL
$controls.CODEX_EXTRA_ARGS = New-Input "CODEX_EXTRA_ARGS"
Add-Field $brainPanel "Codex extra args" $controls.CODEX_EXTRA_ARGS
$controls.CLAUDE_MODEL = New-Combo "CLAUDE_MODEL" $claudeModels
Add-Field $brainPanel "Claude model" $controls.CLAUDE_MODEL
$controls.OPENAI_BASE_URL = New-Input "OPENAI_BASE_URL"
Add-Field $brainPanel "OpenAI-compatible base URL" $controls.OPENAI_BASE_URL
$controls.OPENAI_MODEL = New-Combo "OPENAI_MODEL" $openAiModels
Add-Field $brainPanel "OpenAI model" $controls.OPENAI_MODEL
$controls.GEMINI_MODEL = New-Combo "GEMINI_MODEL" $geminiModels
Add-Field $brainPanel "Gemini model" $controls.GEMINI_MODEL
$controls.OLLAMA_BASE_URL = New-Input "OLLAMA_BASE_URL"
Add-Field $brainPanel "Ollama base URL" $controls.OLLAMA_BASE_URL
$controls.OLLAMA_MODEL = New-Combo "OLLAMA_MODEL" $ollamaModels
Add-Field $brainPanel "Ollama model" $controls.OLLAMA_MODEL

$controls.TELEGRAM_BOT_TOKEN = New-Input "TELEGRAM_BOT_TOKEN" $true
Add-Field $tokenPanel "Telegram bot token" $controls.TELEGRAM_BOT_TOKEN
$controls.TELEGRAM_ALLOWED_USER_IDS = New-Input "TELEGRAM_ALLOWED_USER_IDS"
Add-Field $tokenPanel "Telegram allowed user IDs" $controls.TELEGRAM_ALLOWED_USER_IDS
$controls.SLACK_BOT_TOKEN = New-Input "SLACK_BOT_TOKEN" $true
Add-Field $tokenPanel "Slack bot token" $controls.SLACK_BOT_TOKEN
$controls.SLACK_APP_TOKEN = New-Input "SLACK_APP_TOKEN" $true
Add-Field $tokenPanel "Slack app token" $controls.SLACK_APP_TOKEN
$controls.ANTHROPIC_API_KEY = New-Input "ANTHROPIC_API_KEY" $true
Add-Field $tokenPanel "Anthropic API key" $controls.ANTHROPIC_API_KEY
$controls.OPENAI_API_KEY = New-Input "OPENAI_API_KEY" $true
Add-Field $tokenPanel "OpenAI API key" $controls.OPENAI_API_KEY
$controls.GOOGLE_API_KEY = New-Input "GOOGLE_API_KEY" $true
Add-Field $tokenPanel "Google API key" $controls.GOOGLE_API_KEY

$controls.ENABLE_AGENT_TOOLS = New-Combo "ENABLE_AGENT_TOOLS" @("true", "false")
Add-Field $agentPanel "Agent tools" $controls.ENABLE_AGENT_TOOLS
$controls.AGENT_ALLOWED_CHANNELS = New-Input "AGENT_ALLOWED_CHANNELS"
Add-Field $agentPanel "Allowed Slack channels" $controls.AGENT_ALLOWED_CHANNELS
$controls.AGENT_SAFE_MODE = New-Combo "AGENT_SAFE_MODE" @("true", "false")
Add-Field $agentPanel "Safe mode" $controls.AGENT_SAFE_MODE
$controls.SYSTEM_PROMPT = New-Object System.Windows.Forms.TextBox
$controls.SYSTEM_PROMPT.Name = "SYSTEM_PROMPT"
$controls.SYSTEM_PROMPT.Multiline = $true
$controls.SYSTEM_PROMPT.Width = 680
$controls.SYSTEM_PROMPT.Height = 110
$controls.SYSTEM_PROMPT.BackColor = [System.Drawing.Color]::FromArgb(14, 20, 26)
$controls.SYSTEM_PROMPT.ForeColor = [System.Drawing.Color]::White
Add-Field $agentPanel "System prompt" $controls.SYSTEM_PROMPT

$useText = New-Object System.Windows.Forms.Label
$useText.Text = @"
1. Install Vortex from the GitHub PowerShell command.
2. Use the Chat tab immediately. Telegram and Slack are not compulsory.
3. Add Telegram or Slack tokens only if you want messages to reach those apps.
4. Pick brains/models in Setup and Models. You can type any new model name.
5. Click Save, then Restart Bot after token/model changes.
"@
$useText.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$useText.ForeColor = [System.Drawing.Color]::FromArgb(220, 228, 235)
$useText.AutoSize = $true
$useText.MaximumSize = New-Object System.Drawing.Size(820, 0)
[void]$usePanel.Controls.Add($useText)

$footer = New-Object System.Windows.Forms.Panel
$footer.Dock = "Bottom"
$footer.Height = 58
$footer.BackColor = [System.Drawing.Color]::FromArgb(11, 16, 20)
$form.Controls.Add($footer)

function New-Button($text, $x) {
  $button = New-Object System.Windows.Forms.Button
  $button.Text = $text
  $button.Width = 128
  $button.Height = 34
  $button.Location = New-Object System.Drawing.Point($x, 12)
  $button.BackColor = [System.Drawing.Color]::FromArgb(112, 227, 159)
  $button.ForeColor = [System.Drawing.Color]::FromArgb(5, 9, 10)
  $button.FlatStyle = "Flat"
  return $button
}

$saveButton = New-Button "Save" 20
$restartButton = New-Button "Restart Bot" 158
$refreshButton = New-Button "Refresh" 296
$browserButton = New-Button "Web UI" 434
$logButton = New-Button "Log" 572
$footer.Controls.AddRange(@($saveButton, $restartButton, $refreshButton, $browserButton, $logButton))

function Load-VortexData {
  try {
    Start-VortexServer
    $currentStatus = Invoke-VortexApi "/api/status"
    $envValues = Invoke-VortexApi "/api/env"
    foreach ($key in $controls.Keys) {
      $value = [string]($envValues.$key)
      $controls[$key].Text = $value
    }
    $status.Text = "Running | " + $currentStatus.brain.provider
    $status.ForeColor = [System.Drawing.Color]::FromArgb(112, 227, 159)
  }
  catch {
    $status.Text = "Not connected"
    $status.ForeColor = [System.Drawing.Color]::FromArgb(255, 190, 118)
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Vortex", "OK", "Warning") | Out-Null
  }
}

function Save-VortexData {
  try {
    $values = @{}
    foreach ($key in $controls.Keys) {
      $values[$key] = $controls[$key].Text
    }
    Invoke-VortexApi "/api/env" "POST" $values | Out-Null
    $status.Text = "Saved. Restart Vortex to reload bot tokens."
    $status.ForeColor = [System.Drawing.Color]::FromArgb(107, 216, 255)
  }
  catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Save failed", "OK", "Error") | Out-Null
  }
}

function Send-LocalChat {
  $text = $chatInput.Text.Trim()
  if (-not $text) { return }
  $chatOutput.AppendText("`r`n`r`nYou: $text")
  $chatInput.Text = ""
  $sendChatButton.Enabled = $false
  $sendChatButton.Text = "Sending..."
  try {
    $reply = Invoke-VortexApi "/api/chat" "POST" @{ text = $text }
    $chatOutput.AppendText("`r`n`r`nVortex: " + [string]$reply.answer)
  }
  catch {
    $chatOutput.AppendText("`r`n`r`nVortex: " + $_.Exception.Message)
  }
  finally {
    $sendChatButton.Text = "Send"
    $sendChatButton.Enabled = $true
  }
}

$saveButton.Add_Click({ Save-VortexData })
$sendChatButton.Add_Click({ Send-LocalChat })
$chatInput.Add_KeyDown({
  if ($_.KeyCode -eq "Enter") {
    $_.SuppressKeyPress = $true
    Send-LocalChat
  }
})
$restartButton.Add_Click({
  try {
    $status.Text = "Restarting..."
    Restart-VortexServer
    Load-VortexData
  }
  catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Restart failed", "OK", "Error") | Out-Null
  }
})
$refreshButton.Add_Click({ Load-VortexData })
$browserButton.Add_Click({ Start-Process $dashboardUrl })
$logButton.Add_Click({
  if (Test-Path -LiteralPath $logPath) {
    Start-Process notepad.exe $logPath
  }
})

$form.Add_Shown({
  $form.Activate()
  $form.BringToFront()
  Load-VortexData
  $form.TopMost = $false
})
[void]$form.ShowDialog()
