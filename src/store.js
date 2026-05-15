import fs from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), ".data");
const storePath = path.join(dataDir, "threads.json");

async function readAll() {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeAll(data) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(data, null, 2));
}

export async function getHistory(key) {
  const data = await readAll();
  return data[key] || [];
}

export async function appendHistory(key, messages, maxMessages) {
  const data = await readAll();
  const current = data[key] || [];
  data[key] = [...current, ...messages].slice(-maxMessages);
  await writeAll(data);
}

export async function clearHistory(key) {
  const data = await readAll();
  delete data[key];
  await writeAll(data);
}
