# Security

## Secrets

Never commit `.env`, Slack tokens, Telegram tokens, API keys, or screenshots containing secrets.

If a token is exposed:

1. Revoke it immediately in the provider dashboard.
2. Generate a new token.
3. Update `.env`.
4. Restart the bot.

## Reporting Issues

Please open a GitHub security advisory or contact the maintainer privately if the issue exposes secrets, allows unauthorized chat access, or enables remote command execution.

## Local Dashboard

The dashboard binds to `127.0.0.1` by default. Do not expose it publicly unless you add authentication and understand the risk.
