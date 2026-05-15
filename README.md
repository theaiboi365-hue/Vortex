# Claude Social Bridge

One small bot that brings Claude to Slack and Telegram at the same time.

It is made for people who want a private AI assistant in team chat, family chat, creator communities, startup workspaces, and personal automation channels without building two separate bots.

## Why people may star it

- One backend powers both Slack and Telegram.
- Windows one-click install scripts are included.
- Slack replies can stay inside the same thread.
- Telegram works with the normal BotFather flow.
- Local thread memory is stored in `.data/threads.json`.
- Owner allowlists keep random users out.
- Render worker deploy config is included.
- No secrets are committed.

## Quick Start on Windows

```powershell
cd "C:\path\to\claude-social-bridge"
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
notepad .env
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

## Required Keys

Add these in `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
TELEGRAM_BOT_TOKEN=123456:abc...
```

Slack is optional. Telegram is optional. Claude is required.

## Slack Setup

1. Create a Slack app at `api.slack.com/apps`.
2. Enable Socket Mode.
3. Create an app-level token with `connections:write`.
4. Add bot scopes: `chat:write`, `channels:history`, `groups:history`, `im:history`, `mpim:history`.
5. Install the app to your workspace.
6. Put `SLACK_BOT_TOKEN=xoxb-...` and `SLACK_APP_TOKEN=xapp-...` in `.env`.
7. Invite the bot into the Slack channel.

To restrict channels or users:

```env
SLACK_ALLOWED_CHANNEL_IDS=C123456,C999999
SLACK_ALLOWED_USER_IDS=U123456,U999999
```

## Telegram Setup

1. Open Telegram.
2. Search `@BotFather`.
3. Run `/newbot`.
4. Copy the token into `.env` as `TELEGRAM_BOT_TOKEN`.
5. Search your new bot username and press Start.

To restrict users:

```env
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
```

## Commands

```text
/start   Telegram welcome message
/reset   Clear memory for the current Telegram chat or Slack thread
```

In Slack, typing `reset chat` also clears the current thread memory.

## Run on Laptop Startup

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\make-startup-shortcut.ps1
```

## Deploy on Render

1. Push this repo to GitHub.
2. Create a Render Blueprint from the repo.
3. Add the environment variables in Render.
4. Start the worker.

## Make It More Viral

Good GitHub repos usually need more than code. Add a short demo video or GIF showing:

1. A Telegram question getting answered.
2. A Slack thread reply.
3. The same memory behavior across a conversation.
4. The one-click install script.

Use a title like:

> I built a one-click Claude bot that works in Slack and Telegram at the same time.

## Security

Never paste real tokens into GitHub issues, README files, screenshots, or chat. If a token is exposed, revoke it and create a new one.
