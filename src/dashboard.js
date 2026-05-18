import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { config, envFields } from "./config.js";

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
    ["# Ollama local brain", "OLLAMA_BASE_URL", "OLLAMA_MODEL"],
    ["# Local dashboard", "DASHBOARD_PORT"],
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

function statusFrom(values) {
  const provider = values.AI_PROVIDER || config.brain.defaultProvider;
  const slackProvider = values.SLACK_AI_PROVIDER || config.brain.slackProvider || provider;
  const telegramProvider = values.TELEGRAM_AI_PROVIDER || config.brain.telegramProvider || provider;
  return {
    name: values.BOT_NAME || config.botName,
    port: Number(values.DASHBOARD_PORT || config.dashboardPort),
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

function page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vortex Relay</title>
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
    input, textarea {
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
        <h1>Vortex Relay</h1>
        <p>Codex-first control center for Slack and Telegram. Keep Codex as the main brain, or route each function to Anthropic, OpenAI-compatible APIs, or Ollama.</p>
      </div>
      <div class="pill">Local UI: <strong id="port">8787</strong></div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Setup Tokens</h2>
        <div class="body">
          <form id="setupForm" class="form-grid">
            <div><label>Bot name</label><input name="BOT_NAME" placeholder="Vortex Relay" /></div>
            <div><label>Default AI brain</label><input name="AI_PROVIDER" placeholder="codex" /></div>
            <div><label>Slack AI brain</label><input name="SLACK_AI_PROVIDER" placeholder="blank = default" /></div>
            <div><label>Telegram AI brain</label><input name="TELEGRAM_AI_PROVIDER" placeholder="blank = default" /></div>
            <div><label>Codex command</label><input name="CODEX_COMMAND" placeholder="codex" /></div>
            <div><label>Codex model</label><input name="CODEX_MODEL" placeholder="optional" /></div>
            <div class="wide"><label>Codex extra args</label><input name="CODEX_EXTRA_ARGS" placeholder="optional comma-separated args" /></div>
            <div><label>Claude model</label><input name="CLAUDE_MODEL" placeholder="claude-3-5-sonnet-latest" /></div>
            <div><label>Anthropic API key</label><input name="ANTHROPIC_API_KEY" type="password" autocomplete="off" placeholder="sk-ant-..." /></div>
            <div><label>OpenAI API key</label><input name="OPENAI_API_KEY" type="password" autocomplete="off" placeholder="sk-..." /></div>
            <div><label>OpenAI base URL</label><input name="OPENAI_BASE_URL" placeholder="https://api.openai.com/v1" /></div>
            <div><label>OpenAI model</label><input name="OPENAI_MODEL" placeholder="gpt-4.1-mini" /></div>
            <div><label>Ollama base URL</label><input name="OLLAMA_BASE_URL" placeholder="http://127.0.0.1:11434" /></div>
            <div><label>Ollama model</label><input name="OLLAMA_MODEL" placeholder="gemma3:270m" /></div>
            <div><label>Slack bot token</label><input name="SLACK_BOT_TOKEN" type="password" autocomplete="off" placeholder="xoxb-..." /></div>
            <div><label>Slack app token</label><input name="SLACK_APP_TOKEN" type="password" autocomplete="off" placeholder="xapp-..." /></div>
            <div><label>Slack signing secret</label><input name="SLACK_SIGNING_SECRET" type="password" autocomplete="off" /></div>
            <div><label>Allowed Slack channels</label><input name="SLACK_ALLOWED_CHANNEL_IDS" placeholder="C123,C456" /></div>
            <div><label>Telegram bot token</label><input name="TELEGRAM_BOT_TOKEN" type="password" autocomplete="off" placeholder="123456:abc..." /></div>
            <div><label>Allowed Telegram users</label><input name="TELEGRAM_ALLOWED_USER_IDS" placeholder="123456789" /></div>
            <div><label>Thread memory</label><input name="MAX_HISTORY_MESSAGES" placeholder="12" /></div>
            <div><label>Dashboard port</label><input name="DASHBOARD_PORT" placeholder="8787" /></div>
            <div class="wide"><label>System prompt</label><textarea name="SYSTEM_PROMPT" placeholder="You are Codex, a concise, useful AI assistant inside Slack and Telegram."></textarea></div>
          </form>
          <div class="actions">
            <button form="setupForm" type="submit">Save .env</button>
            <button class="ghost" id="refresh" type="button">Refresh Status</button>
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
            <button class="tab" data-tab="runGuide" type="button">Run</button>
          </div>

          <div id="brainGuide">
            <ol>
              <li>Use <code>codex</code> as the default brain for all functions.</li>
              <li>Set <code>SLACK_AI_PROVIDER</code> or <code>TELEGRAM_AI_PROVIDER</code> to override only that surface.</li>
              <li>Supported values: <code>codex</code>, <code>anthropic</code>, <code>openai</code>, <code>ollama</code>.</li>
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
      for (const field of fields) field.value = values[field.name] || "";
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
    document.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
        document.querySelectorAll("#brainGuide,#telegramGuide,#slackGuide,#runGuide").forEach((panel) => panel.classList.add("hidden"));
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

export function startDashboard() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (request.method === "GET" && url.pathname === "/") return send(response, 200, page(), "text/html; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/api/status") return send(response, 200, statusFrom(await readEnv()));
      if (request.method === "GET" && url.pathname === "/api/env") return send(response, 200, await readEnv());
      if (request.method === "POST" && url.pathname === "/api/env") {
        await writeEnv(await readJson(request));
        return send(response, 200, { ok: true });
      }
      return send(response, 404, { error: "Not found" });
    } catch (error) {
      return send(response, 500, { error: error.message });
    }
  });

  server.listen(config.dashboardPort, "127.0.0.1", () => {
    console.log(`Setup dashboard: http://127.0.0.1:${config.dashboardPort}`);
  });

  return server;
}
