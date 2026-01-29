import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { appendFile, writeFile } from "fs/promises";
import type { SessionEntry } from "./types.js";

export type SessionStorageOptions = {
  baseDir?: string;
};

export function resolveBaseDir(options?: SessionStorageOptions) {
  return options?.baseDir ?? join(homedir(), ".super-multica", "sessions");
}

export function resolveSessionDir(sessionId: string, options?: SessionStorageOptions) {
  return join(resolveBaseDir(options), sessionId);
}

export function resolveSessionPath(sessionId: string, options?: SessionStorageOptions) {
  return join(resolveSessionDir(sessionId, options), "session.jsonl");
}

export function ensureSessionDir(sessionId: string, options?: SessionStorageOptions) {
  const dir = resolveSessionDir(sessionId, options);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readEntries(sessionId: string, options?: SessionStorageOptions): SessionEntry[] {
  const filePath = resolveSessionPath(sessionId, options);
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  const entries: SessionEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as SessionEntry);
    } catch {
      // Skip malformed lines
    }
  }
  return entries;
}

export async function appendEntry(
  sessionId: string,
  entry: SessionEntry,
  options?: SessionStorageOptions,
) {
  ensureSessionDir(sessionId, options);
  const filePath = resolveSessionPath(sessionId, options);
  await appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function writeEntries(
  sessionId: string,
  entries: SessionEntry[],
  options?: SessionStorageOptions,
) {
  ensureSessionDir(sessionId, options);
  const filePath = resolveSessionPath(sessionId, options);
  const content = entries.map((entry) => JSON.stringify(entry)).join("\n");
  await writeFile(filePath, content ? `${content}\n` : "", "utf8");
}
