import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { SessionEntry, SessionMeta } from "./types.js";
import { appendEntry, readEntries, writeEntries } from "./storage.js";
import { compactMessages } from "./compaction.js";

export type SessionManagerOptions = {
  sessionId: string;
  baseDir?: string;
  maxMessages?: number;
  keepLast?: number;
};

export class SessionManager {
  private readonly sessionId: string;
  private readonly baseDir?: string;
  private readonly maxMessages: number;
  private readonly keepLast: number;
  private queue: Promise<void> = Promise.resolve();
  private meta: SessionMeta | undefined;

  constructor(options: SessionManagerOptions) {
    this.sessionId = options.sessionId;
    this.baseDir = options.baseDir;
    this.maxMessages = options.maxMessages ?? 80;
    this.keepLast = options.keepLast ?? 60;
    this.meta = this.loadMeta();
  }

  loadEntries(): SessionEntry[] {
    return readEntries(this.sessionId, { baseDir: this.baseDir });
  }

  loadMessages(): AgentMessage[] {
    const entries = this.loadEntries();
    return entries
      .filter((entry) => entry.type === "message")
      .map((entry) => entry.message);
  }

  loadMeta(): SessionMeta | undefined {
    const entries = this.loadEntries();
    let meta: SessionMeta | undefined;
    for (const entry of entries) {
      if (entry.type === "meta") {
        meta = entry.meta;
      }
    }
    return meta;
  }

  getMeta(): SessionMeta | undefined {
    return this.meta;
  }

  saveMeta(meta: SessionMeta) {
    this.meta = meta;
    void this.enqueue(() =>
      appendEntry(
        this.sessionId,
        { type: "meta", meta, timestamp: Date.now() },
        { baseDir: this.baseDir },
      ),
    );
  }

  saveMessage(message: AgentMessage) {
    void this.enqueue(() =>
      appendEntry(
        this.sessionId,
        { type: "message", message, timestamp: Date.now() },
        { baseDir: this.baseDir },
      ),
    );
  }

  async maybeCompact(messages: AgentMessage[]) {
    const result = compactMessages(messages, this.maxMessages, this.keepLast);
    if (!result) return null;
    const entries: SessionEntry[] = [];
    if (this.meta) {
      entries.push({ type: "meta", meta: this.meta, timestamp: Date.now() });
    }
    for (const message of result.kept) {
      entries.push({ type: "message", message, timestamp: Date.now() });
    }
    entries.push({
      type: "compaction",
      removed: result.removedCount,
      kept: result.kept.length,
      timestamp: Date.now(),
    });
    await this.enqueue(() =>
      writeEntries(this.sessionId, entries, { baseDir: this.baseDir }),
    );
    return result;
  }

  private enqueue(task: () => Promise<void>) {
    this.queue = this.queue.then(task, task);
    return this.queue;
  }
}
