# Windows One-Click Setup

Vortex can be installed from GitHub with one PowerShell command.

## Install

Open PowerShell and run:

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/theaiboi365-hue/Vortex/main/scripts/setup-windows.ps1 | iex"
```

## Terminal Install

For a normal terminal install:

```powershell
git clone https://github.com/theaiboi365-hue/Vortex.git
cd Vortex
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
- Create Desktop and Start Menu launchers named `Vortex`
- Use the Vortex logo icon for the launchers
- Start Vortex in the background
- Open `http://127.0.0.1:8787`
- Reinstall safely over an existing Vortex folder without failing when Windows has the app folder open

## After Install

In the setup UI:

1. Keep `AI_PROVIDER=codex` or choose another brain.
2. Add `TELEGRAM_BOT_TOKEN`.
3. Leave Slack blank unless you want Slack. Slack is optional.
4. If you want Slack later, add `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`.
5. Add optional Anthropic, OpenAI-compatible, or Ollama settings.
6. Save, then open Vortex from the Desktop or Start Menu shortcut.

If Slack and Telegram tokens are blank, Vortex still opens the local dashboard without auth errors.

## Run Manually

```powershell
cd "$env:LOCALAPPDATA\Vortex\app"
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

The `Vortex` Desktop and Start Menu shortcuts use the same launcher. They open the dashboard like an app and only start the background service if it is not already running.

## Enable Startup Again

```powershell
cd "$env:LOCALAPPDATA\Vortex\app"
powershell -ExecutionPolicy Bypass -File .\scripts\make-startup-shortcut.ps1
```
