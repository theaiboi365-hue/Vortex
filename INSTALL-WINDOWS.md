# Windows One-Click Setup

Vortex can be installed from GitHub with one PowerShell command.

## Install

Open PowerShell and run:

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/theaiboi365-hue/codex-social-bridge/main/scripts/setup-windows.ps1 | iex"
```

## Terminal Install

For a normal terminal install:

```powershell
git clone https://github.com/theaiboi365-hue/codex-social-bridge.git
cd codex-social-bridge
npm.cmd install
Copy-Item .env.example .env
npm.cmd start
```

The installer will:

- Download the latest GitHub repo zip
- Install it to `%LOCALAPPDATA%\Vortex\app`
- Run `npm.cmd install`
- Create `.env` from `.env.example`
- Enable startup automation
- Create a desktop launcher
- Start the bot in the background
- Open `http://127.0.0.1:8787`

## After Install

In the setup UI:

1. Keep `AI_PROVIDER=codex` or choose another brain.
2. Add `TELEGRAM_BOT_TOKEN`.
3. Add `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`.
4. Add optional Anthropic, OpenAI-compatible, or Ollama settings.
5. Save, then restart from the desktop launcher.

## Run Manually

```powershell
cd "$env:LOCALAPPDATA\Vortex\app"
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

## Enable Startup Again

```powershell
cd "$env:LOCALAPPDATA\Vortex\app"
powershell -ExecutionPolicy Bypass -File .\scripts\make-startup-shortcut.ps1
```
