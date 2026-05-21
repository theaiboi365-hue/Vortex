# Windows App Install

Vortex is meant to be installed like this:

1. Open the GitHub repo.
2. Copy the command below.
3. Paste it into Windows PowerShell.
4. Let the installer run.
5. Fill tokens/API keys inside the Vortex app window.

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/theaiboi365-hue/Vortex/main/scripts/setup-windows.ps1 | iex"
```

The command downloads the installer script from GitHub and starts the local app installation.

## Terminal Install

For developers only:

```powershell
git clone https://github.com/theaiboi365-hue/Vortex.git
cd Vortex
npm.cmd install
Copy-Item .env.example .env
npm.cmd start
```

The installer will:

- Install Node.js LTS with `winget` if Node/npm are missing and `winget` is available
- Download the latest GitHub repo zip
- Install it to `%LOCALAPPDATA%\Vortex\app`
- Run `npm.cmd install`
- Create `.env` from `.env.example`
- Enable startup automation
- Create Desktop and Start Menu launchers named `Vortex`
- Use the Vortex logo icon for the launchers
- Start Vortex in the background
- Open the native Vortex desktop setup app
- Reinstall safely over an existing Vortex folder without failing when Windows has the app folder open

## After Install

In the Vortex app:

1. Keep `AI_PROVIDER=codex` or choose another brain in `Setup`.
2. Add `TELEGRAM_BOT_TOKEN` in `Tokens`.
3. Add optional Claude/OpenAI/Gemini keys in `Tokens`.
4. Pick models in `Models`.
5. Click `Save`.
6. Click `Restart Bot`.
7. Open Vortex later from Desktop or Start Menu.

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
