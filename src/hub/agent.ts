import { v7 as uuidv7 } from "uuid";
import { Agent as CoreAgent } from "../agent/runner.js";
import { Channel } from "./channel.js";
import type { Message } from "./types.js";

/**
 * Agent — 使用 pi-agent-core 进行真实推理。
 * write() 触发一次模型运行，read() 输出流式结果。
 */
export class Agent {
  readonly id: string;
  private readonly channel = new Channel<Message>();
  private _closed = false;
  private readonly agent: CoreAgent;
  private queue: Promise<void> = Promise.resolve();

  constructor(id?: string) {
    this.id = id ?? uuidv7();
    this.agent = new CoreAgent({
      logger: {
        stdout: this.createChannelStream("[assistant] "),
        stderr: this.createChannelStream("[tool] "),
      },
      sessionId: this.id,
    });
  }

  get closed(): boolean {
    return this._closed;
  }

  /** 写入消息到 agent（非阻塞，串行排队） */
  write(content: string): void {
    if (this._closed) {
      throw new Error("Agent is closed");
    }

    this.queue = this.queue
      .then(async () => {
        const result = await this.agent.run(content);
        if (result.error) {
          this.channel.send({
            id: uuidv7(),
            content: `[error] ${result.error}`,
          });
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.channel.send({ id: uuidv7(), content: `[error] ${message}` });
      });
  }

  /** 持续读取消息流 */
  read(): AsyncIterable<Message> {
    return this.channel;
  }

  /** 关闭 agent，停止所有读取 */
  close(): void {
    if (this._closed) return;
    this._closed = true;
    this.channel.close();
  }

  private createChannelStream(prefix: string): NodeJS.WritableStream {
    let buffer = "";
    return {
      write: (chunk: any) => {
        if (this._closed) return false;
        const text =
          typeof chunk === "string"
            ? chunk
            : chunk?.toString?.() ?? String(chunk);
        if (!text) return true;
        buffer += text;
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (part.length === 0) continue;
          this.channel.send({ id: uuidv7(), content: `${prefix}${part}` });
        }
        return true;
      },
    } as NodeJS.WritableStream;
  }
}
