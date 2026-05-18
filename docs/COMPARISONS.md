# Comparisons

This page is intentionally factual and restrained. It is not meant to attack or impersonate any other project.

## Vortex Relay In One Sentence

Vortex Relay is a Windows-first Slack and Telegram bridge that uses Codex by default and lets users route specific functions to other AI providers.

## Comparison Table

| Category | Vortex Relay |
| --- | --- |
| Primary use case | Use Codex from Telegram and Slack |
| Install style | One PowerShell command on Windows |
| Main interface | Local dashboard at `127.0.0.1:8787` |
| Messaging surfaces | Telegram and Slack |
| Default brain | Codex CLI |
| Alternate brains | Anthropic, OpenAI-compatible APIs, Ollama |
| Routing | Global, Slack-specific, Telegram-specific |
| Startup automation | Windows Startup shortcut |
| Secret storage | Local `.env` |

## OpenClaw-Style Projects

OpenClaw-style projects usually emphasize a broader agent workspace and polished UI. Vortex Relay is narrower: it focuses on getting Codex into Telegram and Slack quickly, with minimal setup and a local configuration dashboard.

## Hermes-Style Projects

Hermes-style projects usually emphasize messaging-agent workflows. Vortex Relay uses a similar messaging-first idea, but focuses on Windows setup, Codex as the default brain, and per-function provider routing.

## When To Use Vortex Relay

- You want Codex from a phone through Telegram.
- You want Codex in a Slack channel.
- You want a local dashboard for tokens and AI routing.
- You want startup automation on Windows.
- You want Codex for coding tasks and Ollama/Claude/OpenAI for selected functions.

## When Not To Use It

- You need a hosted SaaS product.
- You need a polished multi-user admin panel.
- You need a fully cloud-native deployment first.
- You do not want to run anything locally.
