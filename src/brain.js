import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);
const anthropic = new Anthropic({ apiKey: config.anthropicApiKey || "not-set" });

function providerFor(source) {
  if (source === "Slack" && config.brain.slackProvider) return config.brain.slackProvider;
  if (source === "Telegram" && config.brain.telegramProvider) return config.brain.telegramProvider;
  return config.brain.defaultProvider;
}

function historyText(history) {
  return history
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
    .join("\n");
}

function buildPrompt({ history, text, source }) {
  const previous = history.length ? `Conversation so far:\n${historyText(history)}\n\n` : "";
  return `${config.systemPrompt}\n\nYou are replying inside ${source}.\n${previous}User: ${text}\nAssistant:`;
}

async function askCodex(input) {
  const args = ["exec", "--skip-git-repo-check", "--ask-for-approval", "never"];
  if (config.brain.codexModel) args.push("--model", config.brain.codexModel);
  args.push(...config.brain.codexExtraArgs, buildPrompt(input));

  const { stdout, stderr } = await execFileAsync(config.brain.codexCommand, args, {
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true
  });

  const answer = stdout.trim() || stderr.trim();
  return answer || "Codex finished without text. Try again.";
}

async function askAnthropic(input) {
  if (!config.anthropicApiKey) {
    return "Anthropic is selected for this function, but ANTHROPIC_API_KEY is missing.";
  }

  const response = await anthropic.messages.create({
    model: config.claudeModel,
    max_tokens: 1200,
    system: config.systemPrompt,
    messages: [
      ...input.history,
      {
        role: "user",
        content: `[${input.source}] ${input.text}`
      }
    ]
  });

  return response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

async function askOpenAICompatible(input) {
  if (!config.brain.openaiApiKey) {
    return "OpenAI-compatible brain is selected for this function, but OPENAI_API_KEY is missing.";
  }

  const response = await fetch(`${config.brain.openaiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.brain.openaiApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: config.brain.openaiModel,
      messages: [
        { role: "system", content: config.systemPrompt },
        ...input.history,
        { role: "user", content: `[${input.source}] ${input.text}` }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenAI-compatible request failed");
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function askOllama(input) {
  const response = await fetch(`${config.brain.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: config.brain.ollamaModel,
      stream: false,
      messages: [
        { role: "system", content: config.systemPrompt },
        ...input.history,
        { role: "user", content: `[${input.source}] ${input.text}` }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ollama request failed");
  return data.message?.content?.trim() || "";
}

export async function askBrain(input) {
  const provider = providerFor(input.source).toLowerCase();
  if (provider === "codex") return askCodex(input);
  if (provider === "anthropic" || provider === "claude") return askAnthropic(input);
  if (provider === "openai" || provider === "openai-compatible") return askOpenAICompatible(input);
  if (provider === "ollama" || provider === "local") return askOllama(input);
  return `Unknown AI provider "${provider}". Use codex, anthropic, openai, or ollama.`;
}
