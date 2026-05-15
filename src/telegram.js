import { askClaude } from "./claude.js";
import { config } from "./config.js";
import { appendHistory, clearHistory, getHistory } from "./store.js";
import { allowed, cleanText } from "./guards.js";

function apiUrl(method) {
  return `https://api.telegram.org/bot${config.telegram.botToken}/${method}`;
}

async function telegram(method, body = {}) {
  const response = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result;
}

async function sendMessage(chatId, text) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text: text || "I got an empty answer from Claude. Try again."
  });
}

async function sendChatAction(chatId) {
  return telegram("sendChatAction", {
    chat_id: chatId,
    action: "typing"
  });
}

async function handleMessage(msg) {
  if (!msg.text) return;
  if (!allowed(msg.from?.id, config.telegram.allowedUserIds)) return;

  const chatId = msg.chat.id;
  const text = cleanText(msg.text);
  const key = `telegram:${chatId}`;

  if (text === "/start") {
    await sendMessage(
      chatId,
      `Hi, I am ${config.botName}. Send me a message and I will answer with Claude. Use /reset to clear this chat.`
    );
    return;
  }

  if (text === "/reset") {
    await clearHistory(key);
    await sendMessage(chatId, "Done. I cleared this chat memory.");
    return;
  }

  if (text.startsWith("/")) return;

  try {
    await sendChatAction(chatId);
    const history = await getHistory(key);
    const answer = await askClaude({ history, text, source: "Telegram" });
    await appendHistory(
      key,
      [
        { role: "user", content: text },
        { role: "assistant", content: answer }
      ],
      config.maxHistoryMessages
    );
    await sendMessage(chatId, answer);
  } catch (error) {
    console.error("Telegram handler failed:", error);
    await sendMessage(chatId, `I hit an error: ${error.message}`);
  }
}

export function startTelegram() {
  if (!config.telegram.botToken) {
    console.log("Telegram disabled: set TELEGRAM_BOT_TOKEN to enable it.");
    return null;
  }

  let offset = 0;
  let stopped = false;

  async function poll() {
    while (!stopped) {
      try {
        const updates = await telegram("getUpdates", {
          offset,
          timeout: 25,
          allowed_updates: ["message"]
        });

        for (const update of updates) {
          offset = update.update_id + 1;
          if (update.message) await handleMessage(update.message);
        }
      } catch (error) {
        console.error("Telegram polling failed:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  telegram("getMe").then((me) => {
    console.log(`Telegram bot running as @${me.username}.`);
  });

  poll();

  return {
    stop() {
      stopped = true;
    }
  };
}
