import type { AgentMessage } from "@mariozechner/pi-agent-core";

export type CompactionResult = {
  kept: AgentMessage[];
  removedCount: number;
};

export function compactMessages(messages: AgentMessage[], maxMessages: number, keepLast: number) {
  if (messages.length <= maxMessages) return null;
  const kept = messages.slice(-keepLast);
  return {
    kept,
    removedCount: messages.length - kept.length,
  } satisfies CompactionResult;
}
