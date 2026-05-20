import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);
const dashboardUrl = `http://127.0.0.1:${config.dashboardPort}`;

function isAgentRequest(text) {
  const clean = text.toLowerCase().trim();
  return clean === "/tools" || clean === "/agent" || clean.startsWith("vortex ");
}

function helpText() {
  return [
    "Vortex safe agent tools:",
    "",
    "vortex status - show local dashboard and safety mode",
    "vortex open dashboard - open the local setup UI on this laptop",
    "vortex git status - show repo changes",
    "vortex check - run npm.cmd run check",
    "vortex files - list main project files",
    "",
    "Safety: arbitrary shell commands, deletes, moves, token printing, and system changes are blocked."
  ].join("\n");
}

function blockedText() {
  return [
    "Blocked for safety.",
    "Vortex safe mode only allows approved tools. Try /tools to see what I can do."
  ].join("\n");
}

async function runSafe(command, args) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: process.cwd(),
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 4,
    windowsHide: true
  });
  return (stdout || stderr || "Done.").trim();
}

async function openDashboard() {
  if (process.platform === "win32") {
    await execFileAsync("powershell.exe", ["-NoProfile", "-Command", "Start-Process", dashboardUrl], {
      windowsHide: true,
      timeout: 10000
    });
    return `Opened Vortex dashboard on this laptop: ${dashboardUrl}`;
  }
  return `Open this dashboard URL: ${dashboardUrl}`;
}

export async function handleAgentCommand({ text }) {
  if (!config.agent.enabled) return null;
  if (!isAgentRequest(text)) return null;

  const clean = text.toLowerCase().trim();
  if (clean === "/tools" || clean === "/agent" || clean === "vortex tools" || clean === "vortex help") {
    return helpText();
  }
  if (clean === "vortex status") {
    return [
      "Vortex is running.",
      `Dashboard: ${dashboardUrl}`,
      `Agent mode: ${config.agent.mode}`,
      `Workspace: ${process.cwd()}`
    ].join("\n");
  }
  if (clean === "vortex open dashboard" || clean === "vortex open") {
    return openDashboard();
  }
  if (clean === "vortex git status") {
    return runSafe("git", ["status", "--short"]);
  }
  if (clean === "vortex check") {
    return runSafe("npm.cmd", ["run", "check"]);
  }
  if (clean === "vortex files") {
    return runSafe("git", ["ls-files"]);
  }

  return blockedText();
}
