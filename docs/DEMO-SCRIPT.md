# Demo Script

## 30-Second Version

### Shot 1: Install

Show PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/theaiboi365-hue/codex-social-bridge/main/scripts/setup-windows.ps1 | iex"
```

Voiceover:

> This installs Vortex and opens a local setup dashboard.

### Shot 2: Setup UI

Show `http://127.0.0.1:8787`.

Voiceover:

> Codex is the default brain. Paste Telegram and Slack tokens here.

### Shot 3: Telegram

Show a Telegram message:

```text
Summarize my project and give me the next coding task.
```

Voiceover:

> Now I can send Codex instructions from my phone.

### Shot 4: Slack

Show Slack threaded reply.

Voiceover:

> The same bot works in Slack, with replies kept in threads.

### Shot 5: Brain Routing

Show dashboard fields:

```env
AI_PROVIDER=codex
TELEGRAM_AI_PROVIDER=ollama
SLACK_AI_PROVIDER=anthropic
```

Voiceover:

> Codex can be the default, but each function can use another AI if needed.

## 10-Second Hook

> I wanted Codex on my phone, so I built a one-command Windows bridge for Telegram and Slack.

Show install command, dashboard, Telegram reply, GitHub URL.

## Screenshot List

Save these images for README and social posts:

- `docs/screenshots/01-installer.png`
- `docs/screenshots/02-dashboard.png`
- `docs/screenshots/03-telegram-reply.png`
- `docs/screenshots/04-slack-thread.png`
- `docs/screenshots/05-brain-routing.png`
