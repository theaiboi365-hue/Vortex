# Claude Social Bridge

OpenClaw-style control UI for a private Claude bot that works in Slack and Telegram from one repo.

This is made for people who want a ready-to-use GitHub project: clone it, install it, paste the Telegram and Slack tokens into a local dashboard, and run one assistant across both messaging apps.

## What You Get

- Local setup dashboard at `http://127.0.0.1:8787`
- Telegram token UI with BotFather steps
- Slack token UI for `xoxb` bot tokens and `xapp` Socket Mode tokens
- One backend for Slack and Telegram
- Slack threaded replies by default
- Telegram `/start` and `/reset`
- Per-thread local memory in `.data/threads.json`
- Optional Slack channel/user allowlists
- Optional Telegram user allowlist
- Windows install and startup scripts
- Render worker deploy file
- GitHub Actions syntax check
- No secrets committed

## Screens

The first screen is the working control center, not a marketing page. It shows token readiness, setup steps, and the exact run commands.

```text
Claude Social Bridge
Private agent control center for Slack Socket Mode and Telegram BotFather setup.

[Setup Tokens] [Readiness] [Telegram] [Slack] [Run]
```

## Quick Start

```powershell
git clone https://github.com/YOUR_NAME/claude-social-bridge.git
cd claude-social-bridge
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
npm.cmd start
```

Open:

```text
http://127.0.0.1:8787
```

Paste your tokens in the dashboard, save, then restart:

```powershell
npm.cmd start
```

## Required Token

Claude replies need:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

Without it, the dashboard still opens and Slack/Telegram can start, but AI replies will ask you to add the key.

## Telegram Setup

1. Open Telegram.
2. Search `@BotFather`.
3. Send `/newbot`.
4. Pick a bot name and username.
5. Copy the token.
6. Open the local dashboard.
7. Paste it into `Telegram bot token`.
8. Save and restart the bot.
9. Search your bot username in Telegram and press Start.

Optional lock-down:

```env
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
```

## Slack Setup

1. Create a Slack app at `https://api.slack.com/apps`.
2. Enable Socket Mode.
3. Create an app-level token with `connections:write`; this is the `xapp-...` token.
4. Add bot scopes such as `chat:write`, `channels:history`, `groups:history`, `im:history`, and `mpim:history`.
5. Install the app to your workspace.
6. Copy the bot token; this is the `xoxb-...` token.
7. Paste both Slack tokens in the local dashboard.
8. Save, restart, and invite the bot to a channel.

Optional lock-down:

```env
SLACK_ALLOWED_CHANNEL_IDS=C123456,C999999
SLACK_ALLOWED_USER_IDS=U123456,U999999
```

## Commands

```text
/start      Telegram welcome message
/reset      Clear Telegram chat memory
reset chat  Clear Slack thread memory
```

Slack replies stay in the current thread when:

```env
REPLY_IN_THREAD=true
```

## Run on Laptop Startup

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\make-startup-shortcut.ps1
```

That creates a Windows Startup shortcut so the bot launches when you sign in.

## Deploy on Render

1. Push this repo to GitHub.
2. Create a Render Blueprint from the repo.
3. Add the environment variables in Render.
4. Start the worker.

The included `render.yaml` is for a background worker, not a public website.

## Environment

Copy `.env.example` to `.env` or let the installer do it:

```env
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-latest
DASHBOARD_PORT=8787
BOT_NAME=Claude Social Bridge
SYSTEM_PROMPT=You are a concise, useful AI assistant inside Slack and Telegram.
MAX_HISTORY_MESSAGES=12
REPLY_IN_THREAD=true
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=
SLACK_ALLOWED_CHANNEL_IDS=
SLACK_ALLOWED_USER_IDS=
TELEGRAM_BOT_TOKEN=123456:abc...
TELEGRAM_ALLOWED_USER_IDS=
```

## Security

Never commit `.env`. If you paste a token in a public place, revoke it and create a new one. The dashboard writes tokens only to your local `.env` file.

## License

MIT
