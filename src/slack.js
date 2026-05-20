import { App } from "@slack/bolt";
import { askBrain } from "./brain.js";
import { handleAgentCommand } from "./agent.js";
import { config } from "./config.js";
import { appendHistory, clearHistory, getHistory } from "./store.js";
import { allowed, cleanText, shouldIgnoreBotMessage } from "./guards.js";

export function startSlack() {
  if (!config.slack.botToken || !config.slack.appToken) {
    console.log("Slack disabled: set SLACK_BOT_TOKEN and SLACK_APP_TOKEN to enable it.");
    return null;
  }

  const app = new App({
    token: config.slack.botToken,
    appToken: config.slack.appToken,
    signingSecret: config.slack.signingSecret || "socket-mode",
    socketMode: true
  });

  app.message(async ({ message, say }) => {
    if (shouldIgnoreBotMessage(message)) return;
    if (!allowed(message.channel, config.slack.allowedChannelIds)) return;
    if (!allowed(message.user, config.slack.allowedUserIds)) return;

    const text = cleanText(message.text);
    if (!text) return;

    const threadTs = message.thread_ts || message.ts;
    const key = `slack:${message.channel}:${threadTs}`;

    if (text.toLowerCase() === "/reset" || text.toLowerCase() === "reset chat") {
      await clearHistory(key);
      await say({ text: "Done. I cleared this thread memory.", thread_ts: threadTs });
      return;
    }

    try {
      const agentAnswer = await handleAgentCommand({ text, source: "Slack" });
      if (agentAnswer) {
        await say({
          text: agentAnswer,
          thread_ts: config.replyInThread ? threadTs : undefined
        });
        return;
      }

      const history = await getHistory(key);
      const answer = await askBrain({ history, text, source: "Slack" });
      await appendHistory(
        key,
        [
          { role: "user", content: text },
          { role: "assistant", content: answer }
        ],
        config.maxHistoryMessages
      );

      await say({
        text: answer || "I got an empty answer from the selected AI brain. Try again.",
        thread_ts: config.replyInThread ? threadTs : undefined
      });
    } catch (error) {
      console.error("Slack handler failed:", error);
      await say({
        text: `I hit an error: ${error.message}`,
        thread_ts: config.replyInThread ? threadTs : undefined
      });
    }
  });

  app.start().then(() => {
    console.log("Slack bot running in Socket Mode.");
  });

  return app;
}
