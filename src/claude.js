import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

export async function askClaude({ history, text, source }) {
  const messages = [
    ...history,
    {
      role: "user",
      content: `[${source}] ${text}`
    }
  ];

  const response = await anthropic.messages.create({
    model: config.claudeModel,
    max_tokens: 1200,
    system: config.systemPrompt,
    messages
  });

  return response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}
