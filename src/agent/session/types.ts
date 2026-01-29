import type { AgentMessage } from "@mariozechner/pi-agent-core";

export type SessionMeta = {
  provider?: string;
  model?: string;
  thinkingLevel?: string;
};

export type SessionEntry =
  | { type: "message"; message: AgentMessage; timestamp: number }
  | { type: "meta"; meta: SessionMeta; timestamp: number }
  | { type: "compaction"; removed: number; kept: number; timestamp: number };
