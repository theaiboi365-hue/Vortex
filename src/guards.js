export function allowed(value, allowedValues) {
  return allowedValues.length === 0 || allowedValues.includes(String(value));
}

export function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function shouldIgnoreBotMessage(message) {
  return Boolean(message.bot_id || message.subtype === "bot_message");
}
