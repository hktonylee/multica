import type { ThinkingLevel } from "@mariozechner/pi-agent-core";

export type AgentRunResult = {
  text: string;
  error?: string;
};

export type AgentLogger = {
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
};

export type AgentOptions = {
  provider?: string;
  model?: string;
  systemPrompt?: string;
  thinkingLevel?: ThinkingLevel;
  cwd?: string;
  sessionId?: string;
  logger?: AgentLogger;
};
