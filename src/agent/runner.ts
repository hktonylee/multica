import { Agent as PiAgentCore, type AgentEvent, type AgentMessage } from "@mariozechner/pi-agent-core";
import type { AgentOptions, AgentRunResult } from "./types.js";
import { createAgentOutput } from "./output.js";
import { resolveModel, resolveTools } from "./tools.js";
import { SessionManager } from "./session/session-manager.js";

export class Agent {
  private readonly agent: PiAgentCore;
  private readonly output;
  private readonly session: SessionManager;

  constructor(options: AgentOptions = {}) {
    const stdout = options.logger?.stdout ?? process.stdout;
    const stderr = options.logger?.stderr ?? process.stderr;
    this.output = createAgentOutput({ stdout, stderr });

    this.agent = new PiAgentCore();
    if (options.systemPrompt) this.agent.setSystemPrompt(options.systemPrompt);

    const sessionId = options.sessionId ?? "default";
    this.session = new SessionManager({ sessionId });
    const storedMeta = this.session.getMeta();
    if (!options.thinkingLevel && storedMeta?.thinkingLevel) {
      this.agent.setThinkingLevel(storedMeta.thinkingLevel as any);
    } else if (options.thinkingLevel) {
      this.agent.setThinkingLevel(options.thinkingLevel);
    }

    const model = options.provider && options.model ? resolveModel(options) : resolveModel({
      ...options,
      provider: storedMeta?.provider,
      model: storedMeta?.model,
    });
    this.agent.setModel(model);
    this.agent.setTools(resolveTools(options));

    const restoredMessages = this.session.loadMessages();
    if (restoredMessages.length > 0) {
      this.agent.replaceMessages(restoredMessages);
    }

    this.session.saveMeta({
      provider: this.agent.state.model?.provider,
      model: this.agent.state.model?.id,
      thinkingLevel: this.agent.state.thinkingLevel,
    });

    this.agent.subscribe((event: AgentEvent) => {
      this.output.handleEvent(event);
      this.handleSessionEvent(event);
    });
  }

  async run(prompt: string): Promise<AgentRunResult> {
    this.output.state.lastAssistantText = "";
    await this.agent.prompt(prompt);
    return { text: this.output.state.lastAssistantText, error: this.agent.state.error };
  }

  private handleSessionEvent(event: AgentEvent) {
    if (event.type === "message_end") {
      const message = event.message as AgentMessage;
      this.session.saveMessage(message);
      if (message.role === "assistant") {
        void this.maybeCompact();
      }
    }
  }

  private async maybeCompact() {
    const messages = this.agent.state.messages.slice();
    const result = await this.session.maybeCompact(messages);
    if (result?.kept) {
      this.agent.replaceMessages(result.kept);
    }
  }
}
