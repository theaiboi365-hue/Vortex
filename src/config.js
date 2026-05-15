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

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  claudeModel: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest",
  botName: process.env.BOT_NAME || "Claude Social Bridge",
  systemPrompt:
    process.env.SYSTEM_PROMPT ||
    "You are a concise, useful AI assistant inside Slack and Telegram.",
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES || 12),
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
  if (!config.anthropicApiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY in .env");
  }
}
