import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageAggregator, type BlockReply, type BlockChunkerConfig } from "./message-aggregator.js";
import type { AgentEvent } from "@mariozechner/pi-agent-core";
import type { MulticaEvent } from "../agent/events.js";

// --- Test helpers ---

function makeMessageStart(id = "msg-1"): AgentEvent {
  return {
    type: "message_start",
    message: { role: "assistant", content: [], id },
  } as unknown as AgentEvent;
}

function makeMessageUpdate(fullText: string): AgentEvent {
  return {
    type: "message_update",
    message: {
      role: "assistant",
      content: [{ type: "text", text: fullText }],
    },
  } as unknown as AgentEvent;
}

function makeMessageUpdateWithThinking(text: string, thinking: string): AgentEvent {
  return {
    type: "message_update",
    message: {
      role: "assistant",
      content: [
        { type: "thinking", thinking },
        { type: "text", text },
      ],
    },
  } as unknown as AgentEvent;
}

function makeMessageEnd(fullText: string): AgentEvent {
  return {
    type: "message_end",
    message: {
      role: "assistant",
      content: [{ type: "text", text: fullText }],
      stopReason: "end_turn",
    },
  } as unknown as AgentEvent;
}

function makeToolStart(name = "exec"): AgentEvent {
  return {
    type: "tool_execution_start",
    toolName: name,
    args: {},
    toolCallId: "tool-1",
  } as unknown as AgentEvent;
}

function makeToolEnd(name = "exec"): AgentEvent {
  return {
    type: "tool_execution_end",
    toolName: name,
    toolCallId: "tool-1",
    result: {},
    isError: false,
  } as unknown as AgentEvent;
}

function makeCompactionStart(): MulticaEvent {
  return { type: "compaction_start" };
}

function makeCompactionEnd(): MulticaEvent {
  return { type: "compaction_end", removed: 5, kept: 10, reason: "tokens" };
}

function smallConfig(overrides?: Partial<BlockChunkerConfig>): BlockChunkerConfig {
  return {
    minChars: 20,
    maxChars: 100,
    breakPreference: "paragraph",
    ...overrides,
  };
}

describe("MessageAggregator", () => {
  let blocks: BlockReply[];
  let passedThrough: Array<AgentEvent | MulticaEvent>;
  let onBlock: ReturnType<typeof vi.fn>;
  let onPassthrough: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    blocks = [];
    passedThrough = [];
    onBlock = vi.fn((block: BlockReply) => blocks.push(block));
    onPassthrough = vi.fn((event: AgentEvent | MulticaEvent) => passedThrough.push(event));
  });

  describe("event routing", () => {
    it("passes through tool_execution_start immediately", () => {
      const agg = new MessageAggregator(smallConfig(), onBlock, onPassthrough);
      const event = makeToolStart();
      agg.handleEvent(event);
      expect(onPassthrough).toHaveBeenCalledWith(event);
      expect(onBlock).not.toHaveBeenCalled();
    });

    it("passes through tool_execution_end immediately", () => {
      const agg = new MessageAggregator(smallConfig(), onBlock, onPassthrough);
      const event = makeToolEnd();
      agg.handleEvent(event);
      expect(onPassthrough).toHaveBeenCalledWith(event);
      expect(onBlock).not.toHaveBeenCalled();
    });

    it("passes through tool_execution_update immediately", () => {
      const agg = new MessageAggregator(smallConfig(), onBlock, onPassthrough);
      const event = { type: "tool_execution_update", toolCallId: "tool-1", content: "output" } as unknown as AgentEvent;
      agg.handleEvent(event);
      expect(onPassthrough).toHaveBeenCalledWith(event);
      expect(onBlock).not.toHaveBeenCalled();
    });

    it("passes through compaction_start immediately", () => {
      const agg = new MessageAggregator(smallConfig(), onBlock, onPassthrough);
      const event = makeCompactionStart();
      agg.handleEvent(event);
      expect(onPassthrough).toHaveBeenCalledWith(event);
    });

    it("passes through compaction_end immediately", () => {
      const agg = new MessageAggregator(smallConfig(), onBlock, onPassthrough);
      const event = makeCompactionEnd();
      agg.handleEvent(event);
      expect(onPassthrough).toHaveBeenCalledWith(event);
    });

    it("passes through message_start immediately and resets state", () => {
      const agg = new MessageAggregator(smallConfig(), onBlock, onPassthrough);
      const event = makeMessageStart();
      agg.handleEvent(event);
      expect(onPassthrough).toHaveBeenCalledWith(event);
      expect(onBlock).not.toHaveBeenCalled();
    });

    it("passes through message_end after flushing buffer", () => {
      const agg = new MessageAggregator(smallConfig(), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      // Add some text that is below minChars
      agg.handleEvent(makeMessageUpdate("Hello world"));

      // End the message — should flush the buffer as a block, then pass through message_end
      const endEvent = makeMessageEnd("Hello world");
      agg.handleEvent(endEvent);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].text).toBe("Hello world");
      expect(blocks[0].isFinal).toBe(true);

      // message_start + message_end both passed through
      const passthroughTypes = passedThrough.map((e) => e.type);
      expect(passthroughTypes).toContain("message_start");
      expect(passthroughTypes).toContain("message_end");
    });
  });

  describe("text delta computation", () => {
    it("computes delta from accumulated text in message_update", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 1000 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      // First update: "Hello"
      agg.handleEvent(makeMessageUpdate("Hello"));
      // Second update: "Hello world" (full text, not delta)
      agg.handleEvent(makeMessageUpdate("Hello world"));

      // Flush to see accumulated text
      agg.handleEvent(makeMessageEnd("Hello world"));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].text).toBe("Hello world");
    });

    it("ignores ThinkingContent blocks, only extracts text", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 1000 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      agg.handleEvent(makeMessageUpdateWithThinking("visible text", "internal thinking"));

      agg.handleEvent(makeMessageEnd("visible text"));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].text).toBe("visible text");
      expect(blocks[0].text).not.toContain("internal thinking");
    });

    it("handles empty delta (duplicate event) gracefully", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 1000 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      agg.handleEvent(makeMessageUpdate("Hello"));
      agg.handleEvent(makeMessageUpdate("Hello")); // duplicate
      agg.handleEvent(makeMessageUpdate("Hello")); // duplicate again

      agg.handleEvent(makeMessageEnd("Hello"));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].text).toBe("Hello");
    });

    it("handles monotonically growing text correctly", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 1000 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      agg.handleEvent(makeMessageUpdate("H"));
      agg.handleEvent(makeMessageUpdate("He"));
      agg.handleEvent(makeMessageUpdate("Hel"));
      agg.handleEvent(makeMessageUpdate("Hell"));
      agg.handleEvent(makeMessageUpdate("Hello"));

      agg.handleEvent(makeMessageEnd("Hello"));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].text).toBe("Hello");
    });
  });

  describe("block emission", () => {
    it("does not emit block when buffer is below minChars", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 100 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());
      agg.handleEvent(makeMessageUpdate("Short text."));
      expect(onBlock).not.toHaveBeenCalled();
    });

    it("emits block when buffer reaches paragraph break after minChars", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 20 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      const text = "This is the first paragraph with enough chars.\n\nSecond paragraph starts here.";
      agg.handleEvent(makeMessageUpdate(text));

      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0].text).toContain("first paragraph");
      expect(blocks[0].isFinal).toBe(false);
    });

    it("emits multiple blocks for very long text", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 20, maxChars: 50 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      const text = "First paragraph content.\n\nSecond paragraph content.\n\nThird paragraph content.";
      agg.handleEvent(makeMessageUpdate(text));

      expect(blocks.length).toBeGreaterThanOrEqual(2);
      // All blocks except the last should have isFinal=false
      for (let i = 0; i < blocks.length; i++) {
        expect(blocks[i].isFinal).toBe(false);
      }
    });

    it("flushes remaining buffer on message_end with isFinal=true", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 20, maxChars: 100 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      const text = "First paragraph here.\n\nSmall tail.";
      agg.handleEvent(makeMessageUpdate(text));
      agg.handleEvent(makeMessageEnd(text));

      const finalBlock = blocks[blocks.length - 1];
      expect(finalBlock.isFinal).toBe(true);
    });

    it("increments block index for each emitted block", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 20, maxChars: 50 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      const text = "First paragraph content.\n\nSecond paragraph content.\n\nThird paragraph.";
      agg.handleEvent(makeMessageUpdate(text));
      agg.handleEvent(makeMessageEnd(text));

      for (let i = 0; i < blocks.length; i++) {
        expect(blocks[i].index).toBe(i);
      }
    });

    it("resets state on message_start", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 1000 }), onBlock, onPassthrough);

      // First message cycle
      agg.handleEvent(makeMessageStart("msg-1"));
      agg.handleEvent(makeMessageUpdate("First message text."));
      agg.handleEvent(makeMessageEnd("First message text."));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].index).toBe(0);

      // Second message cycle — index should reset
      agg.handleEvent(makeMessageStart("msg-2"));
      agg.handleEvent(makeMessageUpdate("Second message text."));
      agg.handleEvent(makeMessageEnd("Second message text."));

      expect(blocks).toHaveLength(2);
      expect(blocks[1].index).toBe(0); // Reset after new message_start
    });

    it("does not emit empty block on message_end with no content", () => {
      const agg = new MessageAggregator(smallConfig(), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());
      agg.handleEvent(makeMessageEnd(""));

      expect(onBlock).not.toHaveBeenCalled();
    });
  });

  describe("interleaved events", () => {
    it("handles tool events interleaved with text updates", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 1000 }), onBlock, onPassthrough);
      agg.handleEvent(makeMessageStart());

      agg.handleEvent(makeMessageUpdate("Before tool call."));
      agg.handleEvent(makeToolStart());
      agg.handleEvent(makeToolEnd());
      // After tool execution, the model continues generating text
      // Note: message_update accumulates full text, so it includes everything
      agg.handleEvent(makeMessageUpdate("Before tool call. After tool result."));

      agg.handleEvent(makeMessageEnd("Before tool call. After tool result."));

      // Tool events should have passed through
      const toolEvents = passedThrough.filter(
        (e) => e.type === "tool_execution_start" || e.type === "tool_execution_end",
      );
      expect(toolEvents).toHaveLength(2);

      // Final block should contain all text
      expect(blocks).toHaveLength(1);
      expect(blocks[0].text).toBe("Before tool call. After tool result.");
    });

    it("handles multiple message cycles (reset between)", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 1000 }), onBlock, onPassthrough);

      // Cycle 1
      agg.handleEvent(makeMessageStart("msg-1"));
      agg.handleEvent(makeMessageUpdate("First response."));
      agg.handleEvent(makeMessageEnd("First response."));

      // Cycle 2
      agg.handleEvent(makeMessageStart("msg-2"));
      agg.handleEvent(makeMessageUpdate("Second response."));
      agg.handleEvent(makeMessageEnd("Second response."));

      expect(blocks).toHaveLength(2);
      expect(blocks[0].text).toBe("First response.");
      expect(blocks[1].text).toBe("Second response.");
      // Both should be final (flushed on message_end)
      expect(blocks[0].isFinal).toBe(true);
      expect(blocks[1].isFinal).toBe(true);
    });

    it("handles compaction events between messages", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 1000 }), onBlock, onPassthrough);

      agg.handleEvent(makeMessageStart("msg-1"));
      agg.handleEvent(makeMessageUpdate("Text before compaction."));
      agg.handleEvent(makeMessageEnd("Text before compaction."));

      // Compaction happens
      agg.handleEvent(makeCompactionStart());
      agg.handleEvent(makeCompactionEnd());

      // New message after compaction
      agg.handleEvent(makeMessageStart("msg-2"));
      agg.handleEvent(makeMessageUpdate("Text after compaction."));
      agg.handleEvent(makeMessageEnd("Text after compaction."));

      expect(blocks).toHaveLength(2);
      const compactionEvents = passedThrough.filter(
        (e) => e.type === "compaction_start" || e.type === "compaction_end",
      );
      expect(compactionEvents).toHaveLength(2);
    });
  });

  describe("reset()", () => {
    it("clears all internal state", () => {
      const agg = new MessageAggregator(smallConfig({ minChars: 1000 }), onBlock, onPassthrough);

      agg.handleEvent(makeMessageStart());
      agg.handleEvent(makeMessageUpdate("Some accumulated text."));

      // Reset externally
      agg.reset();

      // Now end the message — buffer should be empty, no block emitted
      agg.handleEvent(makeMessageEnd("Some accumulated text."));

      // Only the message_end passthrough, no block (buffer was cleared)
      expect(onBlock).not.toHaveBeenCalled();
    });
  });
});
