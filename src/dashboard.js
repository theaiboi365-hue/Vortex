import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { config, envFields } from "./config.js";
import { askBrain } from "./brain.js";

const envPath = path.join(process.cwd(), ".env");

function has(value) {
  return Boolean(String(value || "").trim());
}

function mask(value) {
  if (!has(value)) return "";
  const clean = String(value);
  if (clean.length <= 10) return "saved";
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

function parseEnv(raw) {
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function serializeEnv(values) {
  const groups = [
    ["# AI brain routing", "AI_PROVIDER", "SLACK_AI_PROVIDER", "TELEGRAM_AI_PROVIDER"],
    ["# Codex brain", "CODEX_COMMAND", "CODEX_MODEL", "CODEX_EXTRA_ARGS"],
    ["# Anthropic / Claude brain", "ANTHROPIC_API_KEY", "CLAUDE_MODEL"],
    ["# OpenAI-compatible brain", "OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL"],
    ["# Gemini / Google brain", "GOOGLE_API_KEY", "GEMINI_MODEL"],
    ["# Ollama local brain", "OLLAMA_BASE_URL", "OLLAMA_MODEL"],
    ["# Local dashboard", "DASHBOARD_PORT"],
    ["# Safe agent tools", "AGENT_TOOLS_ENABLED", "AGENT_MODE"],
    ["# Optional behavior", "BOT_NAME", "SYSTEM_PROMPT", "MAX_HISTORY_MESSAGES", "REPLY_IN_THREAD"],
    ["# Slack Socket Mode", "SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "SLACK_SIGNING_SECRET", "SLACK_ALLOWED_CHANNEL_IDS", "SLACK_ALLOWED_USER_IDS"],
    ["# Telegram", "TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USER_IDS"]
  ];

  return `${groups
    .map(([heading, ...keys]) => [heading, ...keys.map((key) => `${key}=${values[key] || ""}`)].join("\n"))
    .join("\n\n")}\n`;
}

async function readEnv() {
  try {
    return parseEnv(await fs.readFile(envPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeEnv(nextValues) {
  const current = await readEnv();
  const values = { ...current };
  for (const key of envFields) {
    if (Object.hasOwn(nextValues, key)) values[key] = String(nextValues[key] || "").trim();
  }
  await fs.writeFile(envPath, serializeEnv(values), "utf8");
}

function runCommandText() {
  return `cd "${process.cwd()}"\nnpm.cmd start`;
}

function copyToSystemClipboard(text) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "win32") {
      reject(new Error("System clipboard copy is only available on Windows."));
      return;
    }
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-Command", "$Input | Set-Clipboard"],
      { windowsHide: true }
    );
    let errorText = "";
    child.stderr.on("data", (chunk) => {
      errorText += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(errorText || `Clipboard copy failed with exit code ${code}`));
    });
    child.stdin.end(text);
  });
}

function statusFrom(values) {
  const provider = values.AI_PROVIDER || config.brain.defaultProvider;
  const slackProvider = values.SLACK_AI_PROVIDER || config.brain.slackProvider || provider;
  const telegramProvider = values.TELEGRAM_AI_PROVIDER || config.brain.telegramProvider || provider;
  return {
    name: values.BOT_NAME || config.botName,
    port: Number(values.DASHBOARD_PORT || config.dashboardPort),
    agent: {
      enabled: (values.AGENT_TOOLS_ENABLED || String(config.agent.enabled)) !== "false",
      mode: values.AGENT_MODE || config.agent.mode
    },
    brain: {
      provider,
      slackProvider,
      telegramProvider,
      codex: has(values.CODEX_COMMAND || config.brain.codexCommand),
      anthropic: has(values.ANTHROPIC_API_KEY || config.anthropicApiKey),
      openai: has(values.OPENAI_API_KEY || config.brain.openaiApiKey),
      ollama: has(values.OLLAMA_BASE_URL || config.brain.ollamaBaseUrl)
    },
    slack: has(values.SLACK_BOT_TOKEN || config.slack.botToken) && has(values.SLACK_APP_TOKEN || config.slack.appToken),
    telegram: has(values.TELEGRAM_BOT_TOKEN || config.telegram.botToken),
    envPath,
    masked: {
      ANTHROPIC_API_KEY: mask(values.ANTHROPIC_API_KEY || config.anthropicApiKey),
      OPENAI_API_KEY: mask(values.OPENAI_API_KEY || config.brain.openaiApiKey),
      SLACK_BOT_TOKEN: mask(values.SLACK_BOT_TOKEN || config.slack.botToken),
      SLACK_APP_TOKEN: mask(values.SLACK_APP_TOKEN || config.slack.appToken),
      TELEGRAM_BOT_TOKEN: mask(values.TELEGRAM_BOT_TOKEN || config.telegram.botToken)
    }
  };
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response, status, body, type = "application/json") {
  response.writeHead(status, { "content-type": type });
  response.end(type === "application/json" ? JSON.stringify(body, null, 2) : body);
}

function options(items) {
  return items.map(([value, label]) => `<option value="${value}">${label}</option>`).join("\n");
}

function optionGroups(groups) {
  return groups
    .map(
      ([label, items]) =>
        `<optgroup label="${label}">\n${items.map(([value, name]) => `<option value="${value}">${name}</option>`).join("\n")}\n</optgroup>`
    )
    .join("\n");
}

function dataListOptions(groupsOrItems) {
  const items = Array.isArray(groupsOrItems[0]?.[1]?.[0])
    ? groupsOrItems.flatMap(([, groupItems]) => groupItems)
    : groupsOrItems;
  return items.map(([value, label]) => `<option value="${value}">${label}</option>`).join("\n");
}

const providerOptions = [
  ["codex", "Codex"],
  ["anthropic", "Claude / Anthropic"],
  ["openai", "OpenAI-compatible"],
  ["gemini", "Gemini / Google"],
  ["ollama", "Ollama local"]
];

const codexModelGroups = [
  ["Codex", [
    ["", "Codex default"],
    ["gpt-5.3-codex", "GPT-5.3 Codex"],
    ["gpt-5.2-codex", "GPT-5.2 Codex"],
    ["gpt-5.1-codex", "GPT-5.1 Codex"],
    ["gpt-5-codex", "GPT-5 Codex"],
    ["gpt-5.1-codex-mini", "GPT-5.1 Codex Mini"]
  ]],
  ["GPT", [
    ["gpt-5.5", "GPT-5.5"],
    ["gpt-5.4", "GPT-5.4"],
    ["gpt-5.4-mini", "GPT-5.4 Mini"],
    ["gpt-5.2", "GPT-5.2"],
    ["gpt-5.2-pro", "GPT-5.2 Pro"],
    ["gpt-5.1", "GPT-5.1"],
    ["gpt-5.1-pro", "GPT-5.1 Pro"],
    ["gpt-5", "GPT-5"],
    ["gpt-5-mini", "GPT-5 Mini"],
    ["gpt-5-nano", "GPT-5 Nano"],
    ["gpt-4.1", "GPT-4.1"],
    ["gpt-4.1-mini", "GPT-4.1 Mini"],
    ["gpt-4.1-nano", "GPT-4.1 Nano"],
    ["gpt-4o", "GPT-4o"],
    ["gpt-4o-mini", "GPT-4o Mini"]
  ]],
  ["Reasoning", [
    ["o3", "o3"],
    ["o3-pro", "o3 Pro"],
    ["o4-mini", "o4 Mini"]
  ]]
];

const claudeModels = [
  ["claude-opus-4-1-20250805", "Claude Opus 4.1"],
  ["claude-opus-4-20250514", "Claude Opus 4"],
  ["claude-sonnet-4-20250514", "Claude Sonnet 4"],
  ["claude-3-7-sonnet-20250219", "Claude Sonnet 3.7"],
  ["claude-3-5-sonnet-latest", "Claude Sonnet 3.5"],
  ["claude-3-5-haiku-latest", "Claude Haiku 3.5"],
  ["claude-3-opus-20240229", "Claude Opus 3"],
  ["claude-3-sonnet-20240229", "Claude Sonnet 3"],
  ["claude-3-haiku-20240307", "Claude Haiku 3"]
];

const openAIModelGroups = [
  ["GPT", [
    ["gpt-5.5", "GPT-5.5"],
    ["gpt-5.4", "GPT-5.4"],
    ["gpt-5.4-mini", "GPT-5.4 Mini"],
    ["gpt-5.2", "GPT-5.2"],
    ["gpt-5.2-pro", "GPT-5.2 Pro"],
    ["gpt-5.1", "GPT-5.1"],
    ["gpt-5.1-pro", "GPT-5.1 Pro"],
    ["gpt-5", "GPT-5"],
    ["gpt-5-mini", "GPT-5 Mini"],
    ["gpt-5-nano", "GPT-5 Nano"],
    ["gpt-4.1", "GPT-4.1"],
    ["gpt-4.1-mini", "GPT-4.1 Mini"],
    ["gpt-4.1-nano", "GPT-4.1 Nano"],
    ["gpt-4o", "GPT-4o"],
    ["gpt-4o-mini", "GPT-4o Mini"],
    ["gpt-4-turbo", "GPT-4 Turbo"],
    ["gpt-3.5-turbo", "GPT-3.5 Turbo"]
  ]],
  ["Reasoning", [
    ["o3", "o3"],
    ["o3-pro", "o3 Pro"],
    ["o4-mini", "o4 Mini"],
    ["o1", "o1"],
    ["o1-pro", "o1 Pro"]
  ]],
  ["Realtime / Audio", [
    ["gpt-realtime", "GPT Realtime"],
    ["gpt-realtime-mini", "GPT Realtime Mini"],
    ["gpt-audio", "GPT Audio"],
    ["gpt-audio-mini", "GPT Audio Mini"]
  ]]
];

const geminiModelGroups = [
  ["Gemini 3", [
    ["gemini-3-pro-preview", "Gemini 3 Pro Preview"],
    ["gemini-3-flash-preview", "Gemini 3 Flash Preview"],
    ["gemini-3-pro-image-preview", "Gemini 3 Pro Image Preview"]
  ]],
  ["Gemini 2.5", [
    ["gemini-2.5-pro", "Gemini 2.5 Pro"],
    ["gemini-2.5-flash", "Gemini 2.5 Flash"],
    ["gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite"]
  ]],
  ["Gemini 2.0", [
    ["gemini-2.0-flash", "Gemini 2.0 Flash"],
    ["gemini-2.0-flash-lite", "Gemini 2.0 Flash-Lite"],
    ["gemini-2.0-flash-preview-image-generation", "Gemini 2.0 Flash Image Preview"]
  ]],
  ["Gemini 1.5", [
    ["gemini-1.5-pro", "Gemini 1.5 Pro"],
    ["gemini-1.5-flash", "Gemini 1.5 Flash"],
    ["gemini-1.5-flash-8b", "Gemini 1.5 Flash 8B"]
  ]]
];

const ollamaModels = [
  ["gemma3:270m", "Gemma 3 270M"],
  ["gemma3:1b", "Gemma 3 1B"],
  ["gemma3:4b", "Gemma 3 4B"],
  ["gemma3:12b", "Gemma 3 12B"],
  ["llama3.2", "Llama 3.2"],
  ["llama3.2:1b", "Llama 3.2 1B"],
  ["llama3.2:3b", "Llama 3.2 3B"],
  ["llama3.1:8b", "Llama 3.1 8B"],
  ["mistral", "Mistral"],
  ["mixtral", "Mixtral"],
  ["qwen2.5:0.5b", "Qwen 2.5 0.5B"],
  ["qwen2.5:1.5b", "Qwen 2.5 1.5B"],
  ["qwen2.5:7b", "Qwen 2.5 7B"],
  ["deepseek-r1:1.5b", "DeepSeek R1 1.5B"],
  ["deepseek-r1:7b", "DeepSeek R1 7B"],
  ["phi4", "Phi 4"],
  ["phi3:mini", "Phi 3 Mini"],
  ["codellama", "Code Llama"]
];

function page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vortex</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0d10;
      --panel: #12161b;
      --panel-2: #171d23;
      --line: #27313b;
      --text: #eff5f1;
      --muted: #a9b5bf;
      --green: #70e39f;
      --cyan: #6bd8ff;
      --amber: #f0c66b;
      --red: #ff7676;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at 20% 0%, rgba(112, 227, 159, .16), transparent 28rem),
        radial-gradient(circle at 80% 10%, rgba(107, 216, 255, .12), transparent 24rem),
        var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    main { max-width: 1160px; margin: 0 auto; padding: 28px 18px 48px; }
    .top { display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: end; margin-bottom: 22px; }
    h1 { font-size: clamp(30px, 5vw, 58px); line-height: 1; margin: 0 0 10px; }
    p { color: var(--muted); margin: 0; line-height: 1.55; }
    .pill { border: 1px solid var(--line); background: rgba(18, 22, 27, .78); padding: 10px 12px; border-radius: 8px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 16px; }
    .panel { background: rgba(18, 22, 27, .88); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    .panel h2 { font-size: 15px; margin: 0; padding: 14px 16px; border-bottom: 1px solid var(--line); color: #dbe8e2; }
    .body { padding: 16px; }
    .status { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .tile { background: var(--panel-2); border: 1px solid var(--line); border-radius: 8px; padding: 14px; min-height: 96px; }
    .tile strong { display: block; font-size: 14px; margin-bottom: 8px; }
    .dot { width: 10px; height: 10px; border-radius: 99px; display: inline-block; margin-right: 8px; background: var(--red); }
    .ok .dot { background: var(--green); }
    label { display: block; color: #dbe8e2; font-size: 13px; margin-bottom: 7px; }
    input, textarea, select {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--line);
      background: #0c1014;
      color: var(--text);
      border-radius: 8px;
      padding: 10px 11px;
      font: inherit;
    }
    textarea { min-height: 86px; resize: vertical; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
    .wide { grid-column: 1 / -1; }
    button {
      border: 0;
      border-radius: 8px;
      padding: 11px 14px;
      color: #06100a;
      background: linear-gradient(135deg, var(--green), var(--cyan));
      font-weight: 800;
      cursor: pointer;
    }
    .ghost { color: var(--text); background: #202832; border: 1px solid var(--line); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
    code, pre { font-family: "Cascadia Code", Consolas, monospace; }
    pre { overflow: auto; background: #080b0e; border: 1px solid var(--line); border-radius: 8px; padding: 12px; color: #cce8d6; }
    .run-command { margin-top: 14px; }
    .code-box { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: stretch; margin-top: 8px; }
    .code-box pre { margin: 0; white-space: pre-wrap; min-height: 100%; }
    .copy-button { min-width: 82px; color: var(--text); background: #202832; border: 1px solid var(--line); }
    ol { color: var(--muted); padding-left: 20px; line-height: 1.65; }
    .tabs { display: flex; gap: 8px; margin-bottom: 12px; }
    .tab { color: var(--text); background: #202832; border: 1px solid var(--line); }
    .tab.active { background: var(--text); color: #0b0d10; }
    .hidden { display: none; }
    .notice { margin-top: 12px; color: var(--amber); min-height: 24px; }
    @media (max-width: 860px) {
      .top, .grid, .status, .form-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <section class="top">
      <div>
        <h1>Vortex</h1>
        <p>Codex-first control center for Slack and Telegram. Keep Codex as the main brain, or route each function to Claude, OpenAI-compatible APIs, Gemini, or Ollama.</p>
      </div>
      <div class="pill">Local UI: <strong id="port">8787</strong></div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Setup Tokens</h2>
        <div class="body">
          <form id="setupForm" class="form-grid">
            <div><label>Bot name</label><input name="BOT_NAME" placeholder="Vortex" /></div>
            <div>
              <label>Default AI brain</label>
              <select name="AI_PROVIDER">
                ${options(providerOptions)}
              </select>
            </div>
            <div>
              <label>Slack AI brain</label>
              <select name="SLACK_AI_PROVIDER">
                <option value="">Use default brain</option>
                ${options(providerOptions)}
              </select>
            </div>
            <div>
              <label>Telegram AI brain</label>
              <select name="TELEGRAM_AI_PROVIDER">
                <option value="">Use default brain</option>
                ${options(providerOptions)}
              </select>
            </div>
            <div><label>Codex command</label><input name="CODEX_COMMAND" placeholder="codex" /></div>
            <div>
              <label>Codex model</label>
              <input name="CODEX_MODEL" list="codexModels" placeholder="Pick or type any Codex/OpenAI model" />
              <datalist id="codexModels">${dataListOptions(codexModelGroups)}</datalist>
            </div>
            <div class="wide"><label>Codex extra args</label><input name="CODEX_EXTRA_ARGS" placeholder="optional comma-separated args" /></div>
            <div>
              <label>Claude model</label>
              <input name="CLAUDE_MODEL" list="claudeModels" placeholder="Pick or type any Claude model" />
              <datalist id="claudeModels">${dataListOptions(claudeModels)}</datalist>
            </div>
            <div><label>Anthropic API key</label><input name="ANTHROPIC_API_KEY" type="password" autocomplete="off" placeholder="sk-ant-..." /></div>
            <div><label>OpenAI API key</label><input name="OPENAI_API_KEY" type="password" autocomplete="off" placeholder="sk-..." /></div>
            <div><label>OpenAI base URL</label><input name="OPENAI_BASE_URL" placeholder="https://api.openai.com/v1" /></div>
            <div>
              <label>OpenAI model</label>
              <input name="OPENAI_MODEL" list="openAIModels" placeholder="Pick or type any OpenAI-compatible model" />
              <datalist id="openAIModels">${dataListOptions(openAIModelGroups)}</datalist>
            </div>
            <div><label>Google API key</label><input name="GOOGLE_API_KEY" type="password" autocomplete="off" placeholder="AIza..." /></div>
            <div>
              <label>Gemini model</label>
              <input name="GEMINI_MODEL" list="geminiModels" placeholder="Pick or type any Gemini model" />
              <datalist id="geminiModels">${dataListOptions(geminiModelGroups)}</datalist>
            </div>
            <div><label>Ollama base URL</label><input name="OLLAMA_BASE_URL" placeholder="http://127.0.0.1:11434" /></div>
            <div>
              <label>Ollama model</label>
              <input name="OLLAMA_MODEL" list="ollamaModels" placeholder="Pick or type any installed Ollama model" />
              <datalist id="ollamaModels">${dataListOptions(ollamaModels)}</datalist>
            </div>
            <div><label>Slack bot token</label><input name="SLACK_BOT_TOKEN" type="password" autocomplete="off" placeholder="xoxb-..." /></div>
            <div><label>Slack app token</label><input name="SLACK_APP_TOKEN" type="password" autocomplete="off" placeholder="xapp-..." /></div>
            <div><label>Slack signing secret</label><input name="SLACK_SIGNING_SECRET" type="password" autocomplete="off" /></div>
            <div><label>Allowed Slack channels</label><input name="SLACK_ALLOWED_CHANNEL_IDS" placeholder="C123,C456" /></div>
            <div><label>Telegram bot token</label><input name="TELEGRAM_BOT_TOKEN" type="password" autocomplete="off" placeholder="123456:abc..." /></div>
            <div><label>Allowed Telegram users</label><input name="TELEGRAM_ALLOWED_USER_IDS" placeholder="123456789" /></div>
            <div><label>Thread memory</label><input name="MAX_HISTORY_MESSAGES" placeholder="12" /></div>
            <div><label>Dashboard port</label><input name="DASHBOARD_PORT" placeholder="8787" /></div>
            <div>
              <label>Safe agent tools</label>
              <select name="AGENT_TOOLS_ENABLED">
                <option value="true">On</option>
                <option value="false">Off</option>
              </select>
            </div>
            <div>
              <label>Agent mode</label>
              <select name="AGENT_MODE">
                <option value="safe">Safe approved tools only</option>
              </select>
            </div>
            <div class="wide"><label>System prompt</label><textarea name="SYSTEM_PROMPT" placeholder="You are Codex, a concise, useful AI assistant inside Slack and Telegram."></textarea></div>
          </form>
          <div class="actions">
            <button form="setupForm" type="submit">Save .env</button>
            <button class="ghost" id="refresh" type="button">Refresh Status</button>
          </div>
          <div class="run-command">
            <label>Run Vortex locally</label>
            <p>If this dashboard is already open, Vortex is already running. Paste this in PowerShell only when you need to start it again.</p>
            <div class="code-box">
              <pre id="runCommand">${runCommandText()}</pre>
              <button class="copy-button" id="copyRunCommand" type="button">Copy</button>
            </div>
          </div>
          <div class="notice" id="notice"></div>
        </div>
      </div>

      <aside class="panel">
        <h2>Readiness</h2>
        <div class="body">
          <div class="status">
            <div class="tile" id="brain"><strong><span class="dot"></span>AI Brain</strong><p id="brainText">Checking...</p></div>
            <div class="tile" id="slack"><strong><span class="dot"></span>Slack</strong><p id="slackText">Checking...</p></div>
            <div class="tile" id="telegram"><strong><span class="dot"></span>Telegram</strong><p id="telegramText">Checking...</p></div>
          </div>

          <div class="tabs actions">
            <button class="tab active" data-tab="brainGuide" type="button">Brains</button>
            <button class="tab" data-tab="telegramGuide" type="button">Telegram</button>
            <button class="tab" data-tab="slackGuide" type="button">Slack</button>
            <button class="tab" data-tab="agentGuide" type="button">Agent</button>
            <button class="tab" data-tab="runGuide" type="button">Run</button>
          </div>

          <div id="brainGuide">
            <ol>
              <li>Use <code>codex</code> as the default brain for all functions.</li>
              <li>Set <code>SLACK_AI_PROVIDER</code> or <code>TELEGRAM_AI_PROVIDER</code> to override only that surface.</li>
              <li>Supported values: <code>codex</code>, <code>anthropic</code>, <code>openai</code>, <code>gemini</code>, <code>ollama</code>.</li>
            </ol>
          </div>
          <div id="telegramGuide" class="hidden">
            <ol>
              <li>Open Telegram and search <code>@BotFather</code>.</li>
              <li>Send <code>/newbot</code>, choose a name and username.</li>
              <li>Paste the token above, save, then open your bot username and press Start.</li>
            </ol>
          </div>
          <div id="slackGuide" class="hidden">
            <ol>
              <li>Create a Slack app, enable Socket Mode, and create an app token with <code>connections:write</code>.</li>
              <li>Add bot scopes: <code>chat:write</code>, history scopes, and install to workspace.</li>
              <li>Paste <code>xoxb</code> and <code>xapp</code> tokens above, save, then invite the bot to a channel.</li>
            </ol>
          </div>
          <div id="agentGuide" class="hidden">
            <ol>
              <li>Use <code>/tools</code> in Slack or Telegram to see safe commands.</li>
              <li>Try <code>vortex status</code>, <code>vortex check</code>, <code>vortex files</code>, or <code>vortex open dashboard</code>.</li>
              <li>Vortex only acts when the user explicitly asks with a <code>vortex</code> command.</li>
              <li>Banking/payment actions, secrets, tokens, private data leaks, and data-breach requests are blocked.</li>
            </ol>
          </div>
          <div id="runGuide" class="hidden">
            <pre>npm.cmd install
npm.cmd start</pre>
            <p>After saving tokens or brain routing, restart the process so Slack and Telegram reload the new <code>.env</code> values.</p>
          </div>
        </div>
      </aside>
    </section>
  </main>
  <script>
    const form = document.querySelector("#setupForm");
    const notice = document.querySelector("#notice");
    const fields = Array.from(form.elements).filter((item) => item.name);

    async function api(path, options) {
      const response = await fetch(path, options);
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }

    function setTile(id, ok, text) {
      const tile = document.querySelector("#" + id);
      tile.classList.toggle("ok", ok);
      document.querySelector("#" + id + "Text").textContent = text;
    }

    async function load() {
      const data = await api("/api/status");
      document.querySelector("#port").textContent = data.port;
      setTile("brain", true, "Default: " + data.brain.provider + " | Slack: " + data.brain.slackProvider + " | Telegram: " + data.brain.telegramProvider);
      setTile("slack", data.slack, data.slack ? "Socket Mode tokens saved" : "Add xoxb + xapp tokens");
      setTile("telegram", data.telegram, data.telegram ? "BotFather token saved" : "Add TELEGRAM_BOT_TOKEN");
      const values = await api("/api/env");
      for (const field of fields) {
        const value = values[field.name] || "";
        if (field.tagName === "SELECT" && value && !Array.from(field.options).some((option) => option.value === value)) {
          field.add(new Option(value + " (saved custom)", value));
        }
        field.value = value;
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      await api("/api/env", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      });
      notice.textContent = "Saved. Restart npm.cmd start to apply bot token changes.";
      await load();
    });

    document.querySelector("#refresh").addEventListener("click", load);
    document.querySelector("#copyRunCommand").addEventListener("click", async () => {
      const button = document.querySelector("#copyRunCommand");
      const commandBox = document.querySelector("#runCommand");
      const command = commandBox.textContent;
      const markCopied = () => {
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1400);
      };
      try {
        const response = await fetch("/api/copy-run-command", { method: "POST" });
        if (response.ok) {
          markCopied();
          notice.textContent = "";
          return;
        }
        await navigator.clipboard.writeText(command);
        markCopied();
      } catch {
        const copyArea = document.createElement("textarea");
        copyArea.value = command;
        copyArea.setAttribute("readonly", "");
        copyArea.style.position = "fixed";
        copyArea.style.left = "-9999px";
        document.body.appendChild(copyArea);
        copyArea.select();
        try {
          if (document.execCommand("copy")) {
            markCopied();
            notice.textContent = "";
            copyArea.remove();
            return;
          }
        } catch {}
        copyArea.remove();
        const range = document.createRange();
        range.selectNodeContents(commandBox);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        notice.textContent = "Run command selected. Press Ctrl+C to copy it.";
      }
    });
    document.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
        document.querySelectorAll("#brainGuide,#telegramGuide,#slackGuide,#agentGuide,#runGuide").forEach((panel) => panel.classList.add("hidden"));
        button.classList.add("active");
        document.querySelector("#" + button.dataset.tab).classList.remove("hidden");
      });
    });

    load().catch((error) => {
      notice.textContent = error.message;
    });
  </script>
</body>
</html>`;
}

function cockpitPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vortex</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07090c;
      --panel: #0d1117;
      --panel-2: #111821;
      --panel-3: #151f2a;
      --line: #263241;
      --text: #edf4f8;
      --muted: #93a4b4;
      --soft: #c7d4df;
      --green: #70e39f;
      --cyan: #6bd8ff;
      --amber: #ffc575;
      --red: #ff7676;
      --shadow: 0 24px 70px rgba(0, 0, 0, .35);
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: 0;
    }
    button, input, textarea, select { font: inherit; letter-spacing: 0; }
    .shell { display: grid; grid-template-columns: 248px minmax(0, 1fr) 318px; height: 100vh; }
    .sidebar {
      background: #070b0f;
      border-right: 1px solid var(--line);
      padding: 22px 16px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .brand { display: flex; align-items: center; gap: 12px; padding: 4px 6px 14px; }
    .logo {
      width: 42px; height: 42px; border-radius: 12px;
      display: grid; place-items: center;
      background: linear-gradient(135deg, rgba(112,227,159,.2), rgba(107,216,255,.13));
      border: 1px solid rgba(112,227,159,.28);
      color: var(--green); font-weight: 900; font-size: 22px;
    }
    .brand h1 { margin: 0; font-size: 22px; line-height: 1; }
    .brand p { margin: 4px 0 0; color: var(--muted); font-size: 12px; }
    .nav { display: grid; gap: 8px; }
    .nav button {
      height: 42px; border: 0; border-radius: 8px; color: var(--soft);
      background: transparent; text-align: left; padding: 0 12px;
      cursor: pointer;
    }
    .nav button.active { color: var(--green); background: #111a21; }
    .nav button:hover { background: #10171e; }
    .mini-card {
      margin-top: auto;
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 14px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .main {
      min-width: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      background:
        radial-gradient(circle at top left, rgba(112,227,159,.08), transparent 30%),
        var(--bg);
    }
    .topbar {
      height: 78px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      border-bottom: 1px solid var(--line);
      background: rgba(7, 9, 12, .72);
    }
    .title h2 { margin: 0; font-size: 18px; }
    .title p { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 8px;
      border: 1px solid rgba(112,227,159,.28);
      background: rgba(112,227,159,.09);
      color: var(--green);
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
    }
    .dot { width: 8px; height: 8px; border-radius: 99px; background: currentColor; }
    .chat {
      overflow: auto;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .welcome {
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(17,24,33,.92), rgba(13,17,23,.92));
      box-shadow: var(--shadow);
      border-radius: 10px;
      padding: 20px;
      max-width: 820px;
    }
    .welcome h3 { margin: 0 0 8px; font-size: 24px; }
    .welcome p { margin: 0; color: var(--muted); line-height: 1.55; }
    .quick { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    .quick button, .cmd {
      border: 1px solid var(--line);
      background: #0b1117;
      color: var(--soft);
      border-radius: 8px;
      padding: 9px 11px;
      cursor: pointer;
    }
    .quick button:hover, .cmd:hover { border-color: rgba(112,227,159,.5); color: var(--green); }
    .msg { display: flex; gap: 12px; max-width: 860px; }
    .avatar {
      width: 34px; height: 34px; flex: 0 0 auto; border-radius: 9px;
      display: grid; place-items: center; font-weight: 900;
      background: var(--panel-3); color: var(--green); border: 1px solid var(--line);
    }
    .bubble {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 10px;
      padding: 13px 15px;
      white-space: pre-wrap;
      line-height: 1.55;
      color: var(--soft);
    }
    .msg.user { margin-left: auto; flex-direction: row-reverse; }
    .msg.user .avatar { color: var(--cyan); }
    .msg.user .bubble { background: #101820; color: var(--text); }
    .composer {
      padding: 18px 28px 24px;
      border-top: 1px solid var(--line);
      background: rgba(7, 9, 12, .9);
    }
    .composer-inner {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: end;
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 10px;
      padding: 10px;
    }
    textarea {
      resize: none; min-height: 48px; max-height: 130px;
      border: 0; outline: 0; background: transparent;
      color: var(--text); padding: 8px; line-height: 1.45;
    }
    .send {
      width: 46px; height: 46px; border: 0; border-radius: 8px;
      background: var(--green); color: #06100b; font-weight: 900;
      cursor: pointer;
    }
    .side {
      border-left: 1px solid var(--line);
      background: #090d12;
      padding: 22px 16px;
      overflow: auto;
    }
    .panel {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 14px;
    }
    .panel h3 { margin: 0 0 10px; font-size: 14px; }
    .tile {
      display: flex; align-items: center; justify-content: space-between;
      border-top: 1px solid #1f2a36;
      padding: 10px 0;
      color: var(--muted);
      font-size: 13px;
    }
    .tile strong { color: var(--text); font-weight: 700; }
    .badge {
      border-radius: 999px; padding: 4px 8px; font-size: 11px;
      color: var(--amber); background: rgba(255,197,117,.1);
    }
    .badge.ok { color: var(--green); background: rgba(112,227,159,.1); }
    .settings { display: none; position: absolute; inset: 0; background: rgba(7,9,12,.72); padding: 30px; overflow: auto; }
    .settings.open { display: block; }
    .settings-card { max-width: 980px; margin: 0 auto; background: #0b1117; border: 1px solid var(--line); border-radius: 12px; padding: 20px; box-shadow: var(--shadow); }
    .settings-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 16px; }
    .settings-head h3 { margin: 0; font-size: 22px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .field label { display: block; color: var(--muted); font-size: 12px; font-weight: 700; margin-bottom: 6px; }
    .field input, .field select, .field textarea {
      width: 100%; border: 1px solid var(--line); border-radius: 8px;
      background: #080d12; color: var(--text); padding: 10px 11px; outline: 0;
    }
    .field textarea { min-height: 84px; }
    .wide { grid-column: 1 / -1; }
    .actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
    .primary, .secondary {
      border: 1px solid var(--line); border-radius: 8px; padding: 10px 13px;
      cursor: pointer; color: var(--text); background: var(--panel-2);
    }
    .primary { background: var(--green); color: #06100b; border-color: var(--green); font-weight: 800; }
    .notice { min-height: 20px; margin-top: 10px; color: var(--amber); font-size: 13px; }
    code { font-family: "Cascadia Code", Consolas, monospace; }
    @media (max-width: 1020px) {
      .shell { grid-template-columns: 210px minmax(0, 1fr); }
      .side { display: none; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">V</div>
        <div><h1>Vortex</h1><p>Agent cockpit</p></div>
      </div>
      <nav class="nav">
        <button class="active" type="button">Chat</button>
        <button id="openSettings" type="button">Setup</button>
        <button id="openModels" type="button">Models</button>
        <button id="openChannels" type="button">Channels</button>
      </nav>
      <div class="mini-card">
        Install once. Chat immediately. Add Telegram, Slack, Claude, Gemini, OpenAI, or Ollama only when you need them.
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="title">
          <h2>Chat</h2>
          <p>Local-first command center with optional channel delivery.</p>
        </div>
        <div class="status-pill"><span class="dot"></span><span id="runtimeStatus">Starting</span></div>
      </header>
      <section class="chat" id="chat">
        <div class="welcome">
          <h3>What do you want Vortex to do?</h3>
          <p>Start here like ChatGPT. Telegram and Slack are just delivery channels, not setup blockers.</p>
          <div class="quick">
            <button data-prompt="Explain what Vortex can do in 5 bullets">Explain Vortex</button>
            <button data-prompt="vortex status">Run status</button>
            <button data-prompt="Help me connect Telegram later">Connect Telegram later</button>
          </div>
        </div>
      </section>
      <section class="composer">
        <div class="composer-inner">
          <textarea id="prompt" placeholder="Message Vortex..."></textarea>
          <button class="send" id="send" title="Send">↑</button>
        </div>
      </section>
      <section class="settings" id="settings">
        <div class="settings-card">
          <div class="settings-head">
            <div><h3>Vortex Setup</h3><p style="margin:4px 0 0;color:var(--muted)">Everything is optional except the brain you choose to use.</p></div>
            <button class="secondary" id="closeSettings" type="button">Close</button>
          </div>
          <form id="setupForm" class="grid">
            <div class="field"><label>Bot name</label><input name="BOT_NAME" placeholder="Vortex" /></div>
            <div class="field"><label>Default brain</label><select name="AI_PROVIDER">${options(providerOptions)}</select></div>
            <div class="field"><label>Slack brain</label><select name="SLACK_AI_PROVIDER"><option value="">Use default</option>${options(providerOptions)}</select></div>
            <div class="field"><label>Telegram brain</label><select name="TELEGRAM_AI_PROVIDER"><option value="">Use default</option>${options(providerOptions)}</select></div>
            <div class="field"><label>Codex command</label><input name="CODEX_COMMAND" placeholder="codex" /></div>
            <div class="field"><label>Codex model</label><input name="CODEX_MODEL" list="codexModels" placeholder="optional" /><datalist id="codexModels">${dataListOptions(codexModelGroups)}</datalist></div>
            <div class="field"><label>Claude model</label><input name="CLAUDE_MODEL" list="claudeModels" /><datalist id="claudeModels">${dataListOptions(claudeModels)}</datalist></div>
            <div class="field"><label>OpenAI model</label><input name="OPENAI_MODEL" list="openAIModels" /><datalist id="openAIModels">${dataListOptions(openAIModelGroups)}</datalist></div>
            <div class="field"><label>Gemini model</label><input name="GEMINI_MODEL" list="geminiModels" /><datalist id="geminiModels">${dataListOptions(geminiModelGroups)}</datalist></div>
            <div class="field"><label>Ollama model</label><input name="OLLAMA_MODEL" list="ollamaModels" /><datalist id="ollamaModels">${dataListOptions(ollamaModels)}</datalist></div>
            <div class="field"><label>OpenAI base URL</label><input name="OPENAI_BASE_URL" placeholder="https://api.openai.com/v1" /></div>
            <div class="field"><label>Ollama base URL</label><input name="OLLAMA_BASE_URL" placeholder="http://127.0.0.1:11434" /></div>
            <div class="field"><label>Telegram token (optional)</label><input name="TELEGRAM_BOT_TOKEN" type="password" autocomplete="off" /></div>
            <div class="field"><label>Telegram allowed user IDs</label><input name="TELEGRAM_ALLOWED_USER_IDS" /></div>
            <div class="field"><label>Slack bot token (optional)</label><input name="SLACK_BOT_TOKEN" type="password" autocomplete="off" /></div>
            <div class="field"><label>Slack app token (optional)</label><input name="SLACK_APP_TOKEN" type="password" autocomplete="off" /></div>
            <div class="field"><label>Anthropic key (only for Claude)</label><input name="ANTHROPIC_API_KEY" type="password" autocomplete="off" /></div>
            <div class="field"><label>OpenAI key (only for OpenAI)</label><input name="OPENAI_API_KEY" type="password" autocomplete="off" /></div>
            <div class="field"><label>Google key (only for Gemini)</label><input name="GOOGLE_API_KEY" type="password" autocomplete="off" /></div>
            <div class="field"><label>Dashboard port</label><input name="DASHBOARD_PORT" /></div>
            <div class="field wide"><label>System prompt</label><textarea name="SYSTEM_PROMPT"></textarea></div>
          </form>
          <div class="actions">
            <button class="primary" id="save" type="button">Save</button>
            <button class="secondary" id="refresh" type="button">Refresh</button>
            <button class="secondary" id="copyRunCommand" type="button">Copy Run Command</button>
          </div>
          <div class="notice" id="notice"></div>
        </div>
      </section>
    </main>

    <aside class="side">
      <div class="panel">
        <h3>Runtime</h3>
        <div class="tile"><span>Brain</span><strong id="brainText">codex</strong></div>
        <div class="tile"><span>Telegram</span><span class="badge" id="telegramBadge">Optional</span></div>
        <div class="tile"><span>Slack</span><span class="badge" id="slackBadge">Optional</span></div>
      </div>
      <div class="panel">
        <h3>Safe Commands</h3>
        <button class="cmd" data-prompt="vortex status">vortex status</button>
        <button class="cmd" data-prompt="vortex check">vortex check</button>
        <button class="cmd" data-prompt="vortex files">vortex files</button>
      </div>
      <div class="panel">
        <h3>Install Flow</h3>
        <p style="color:var(--muted);line-height:1.5;margin:0">One PowerShell command installs the app. Users can chat first and connect Telegram/Slack later.</p>
      </div>
    </aside>
  </div>
  <script>
    const form = document.querySelector("#setupForm");
    const fields = Array.from(form.elements).filter((item) => item.name);
    const chat = document.querySelector("#chat");
    const promptBox = document.querySelector("#prompt");
    const sendButton = document.querySelector("#send");
    const settings = document.querySelector("#settings");
    const notice = document.querySelector("#notice");

    async function api(path, options) {
      const response = await fetch(path, options);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(data.error || text || "Request failed");
      return data;
    }
    function setBadge(id, ok) {
      const badge = document.querySelector(id);
      badge.textContent = ok ? "Connected" : "Optional";
      badge.classList.toggle("ok", ok);
    }
    async function load() {
      const status = await api("/api/status");
      document.querySelector("#runtimeStatus").textContent = "Running | " + status.brain.provider;
      document.querySelector("#brainText").textContent = status.brain.provider;
      setBadge("#telegramBadge", status.telegram);
      setBadge("#slackBadge", status.slack);
      const values = await api("/api/env");
      for (const field of fields) field.value = values[field.name] || "";
    }
    function appendMessage(role, text) {
      const row = document.createElement("div");
      row.className = "msg " + (role === "user" ? "user" : "assistant");
      row.innerHTML = '<div class="avatar">' + (role === "user" ? "Y" : "V") + '</div><div class="bubble"></div>';
      row.querySelector(".bubble").textContent = text;
      chat.appendChild(row);
      chat.scrollTop = chat.scrollHeight;
    }
    async function sendMessage(text) {
      const value = (text || promptBox.value).trim();
      if (!value) return;
      promptBox.value = "";
      appendMessage("user", value);
      sendButton.disabled = true;
      sendButton.textContent = "…";
      try {
        const data = await api("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: value }) });
        appendMessage("assistant", data.answer || "Done.");
      } catch (error) {
        appendMessage("assistant", error.message);
      } finally {
        sendButton.disabled = false;
        sendButton.textContent = "↑";
      }
    }
    document.querySelector("#send").addEventListener("click", () => sendMessage());
    promptBox.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
    document.querySelectorAll("[data-prompt]").forEach((button) => {
      button.addEventListener("click", () => sendMessage(button.dataset.prompt));
    });
    document.querySelectorAll("#openSettings,#openModels,#openChannels").forEach((button) => {
      button.addEventListener("click", () => settings.classList.add("open"));
    });
    document.querySelector("#closeSettings").addEventListener("click", () => settings.classList.remove("open"));
    document.querySelector("#refresh").addEventListener("click", () => load().catch((error) => notice.textContent = error.message));
    document.querySelector("#save").addEventListener("click", async () => {
      const values = Object.fromEntries(new FormData(form).entries());
      await api("/api/env", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      notice.textContent = "Saved. Restart Vortex if you changed bot tokens or providers.";
      await load();
    });
    document.querySelector("#copyRunCommand").addEventListener("click", async () => {
      await fetch("/api/copy-run-command", { method: "POST" });
      notice.textContent = "Run command copied.";
    });
    load().catch((error) => appendMessage("assistant", error.message));
  </script>
</body>
</html>`;
}

export function startDashboard() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (request.method === "GET" && url.pathname === "/") return send(response, 200, cockpitPage(), "text/html; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/api/status") return send(response, 200, statusFrom(await readEnv()));
      if (request.method === "GET" && url.pathname === "/api/env") return send(response, 200, await readEnv());
      if (request.method === "POST" && url.pathname === "/api/copy-run-command") {
        await copyToSystemClipboard(runCommandText());
        return send(response, 200, { ok: true });
      }
      if (request.method === "POST" && url.pathname === "/api/env") {
        await writeEnv(await readJson(request));
        return send(response, 200, { ok: true });
      }
      if (request.method === "POST" && url.pathname === "/api/chat") {
        const body = await readJson(request);
        const text = String(body.text || "").trim();
        if (!text) return send(response, 400, { error: "Message is required." });
        const answer = await askBrain({ source: "Vortex", text, history: [] });
        return send(response, 200, { answer });
      }
      return send(response, 404, { error: "Not found" });
    } catch (error) {
      return send(response, 500, { error: error.message });
    }
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Dashboard already running at http://127.0.0.1:${config.dashboardPort}`);
      console.error("Open that URL, or stop the existing Vortex process before starting again.");
      return;
    }
    throw error;
  });

  server.listen(config.dashboardPort, "127.0.0.1", () => {
    console.log(`Setup dashboard: http://127.0.0.1:${config.dashboardPort}`);
  });

  return server;
}
