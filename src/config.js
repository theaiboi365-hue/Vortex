import "dotenv/config";

function list(name) {
  return (process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function bool(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function number(name, fallback) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) ? raw : fallback;
}

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  claudeModel: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest",
  botName: process.env.BOT_NAME || "Claude Social Bridge",
  systemPrompt:
    process.env.SYSTEM_PROMPT ||
    "You are a concise, useful AI assistant inside Slack and Telegram.",
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES || 12),
  dashboardPort: number("DASHBOARD_PORT", 8787),
  replyInThread: bool("REPLY_IN_THREAD", true),
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || "",
    appToken: process.env.SLACK_APP_TOKEN || "",
    signingSecret: process.env.SLACK_SIGNING_SECRET || "",
    allowedChannelIds: list("SLACK_ALLOWED_CHANNEL_IDS"),
    allowedUserIds: list("SLACK_ALLOWED_USER_IDS")
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    allowedUserIds: list("TELEGRAM_ALLOWED_USER_IDS")
  }
};

export function assertBaseConfig() {
  if (!config.anthropicApiKey) console.warn("Claude disabled: set ANTHROPIC_API_KEY to enable AI replies.");
}

export const envFields = [
  "ANTHROPIC_API_KEY",
  "CLAUDE_MODEL",
  "BOT_NAME",
  "SYSTEM_PROMPT",
  "MAX_HISTORY_MESSAGES",
  "REPLY_IN_THREAD",
  "DASHBOARD_PORT",
  "SLACK_BOT_TOKEN",
  "SLACK_APP_TOKEN",
  "SLACK_SIGNING_SECRET",
  "SLACK_ALLOWED_CHANNEL_IDS",
  "SLACK_ALLOWED_USER_IDS",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_ALLOWED_USER_IDS"
];
