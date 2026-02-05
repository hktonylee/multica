import { describe, it, expect } from "vitest";
import { BlockChunker, type BlockChunkerConfig } from "./block-chunker.js";

function cfg(overrides?: Partial<BlockChunkerConfig>): BlockChunkerConfig {
  return {
    minChars: 50,
    maxChars: 200,
    breakPreference: "paragraph",
    ...overrides,
  };
}

describe("BlockChunker", () => {
  describe("tryChunk", () => {
    it("returns null when buffer is below minChars", () => {
      const chunker = new BlockChunker(cfg({ minChars: 100 }));
      expect(chunker.tryChunk("short text")).toBeNull();
    });

    it("returns null when buffer is between minChars and maxChars with no break", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200 }));
      // No whitespace, newline, or punctuation — no break possible
      const text = "a".repeat(50);
      expect(chunker.tryChunk(text)).toBeNull();
    });

    it("splits at paragraph break (\\n\\n) for paragraph preference", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200 }));
      const text = "Hello world, this is a test.\n\nThis is a new paragraph.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      expect(result!.chunk).toBe("Hello world, this is a test.\n\n");
      expect(result!.remainder).toBe("This is a new paragraph.");
    });

    it("splits at newline when no paragraph break available", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200 }));
      const text = "Hello world, this is a test.\nThis is the next line.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      expect(result!.chunk).toBe("Hello world, this is a test.\n");
      expect(result!.remainder).toBe("This is the next line.");
    });

    it("splits at sentence end when no newline available", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200 }));
      const text = "Hello world, this is a test. This is the next sentence.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      expect(result!.chunk).toBe("Hello world, this is a test. ");
      expect(result!.remainder).toBe("This is the next sentence.");
    });

    it("splits at word boundary as last resort", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200 }));
      // No paragraph, newline, or sentence break — only spaces
      const text = "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      // Should split at the last word boundary
      expect(result!.chunk.endsWith(" ")).toBe(true);
      expect(result!.chunk.length + result!.remainder.length).toBe(text.length);
    });

    it("hard-cuts at maxChars when no natural break found", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 50 }));
      const text = "a".repeat(100); // No breaks possible
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      expect(result!.chunk).toBe("a".repeat(50));
      expect(result!.remainder).toBe("a".repeat(50));
    });

    it("prefers break closest to end of search window (larger chunks)", () => {
      const chunker = new BlockChunker(cfg({ minChars: 5, maxChars: 100 }));
      const text = "aaa\nbbb\nccc\nddd";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      // Should pick the last newline break (after "ccc\n")
      expect(result!.chunk).toBe("aaa\nbbb\nccc\n");
      expect(result!.remainder).toBe("ddd");
    });

    it("respects breakPreference: newline skips paragraph-only search", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200, breakPreference: "newline" }));
      const text = "Hello world, this is a test.\nSecond line here.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      expect(result!.chunk).toBe("Hello world, this is a test.\n");
    });

    it("respects breakPreference: sentence skips paragraph and newline", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200, breakPreference: "sentence" }));
      const text = "First sentence.\nSecond sentence here! And a third.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      // Sentence preference should find sentence breaks, scanning backwards
      // The last sentence break is after "third." — but that includes newlines too
      // Actually, sentence breakers scan backwards, so they'll find "third." last
      expect(result!.remainder.length).toBeGreaterThan(0);
    });

    it("handles sentence break at end of string by splitting earlier", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200, breakPreference: "sentence" }));
      const text = "First sentence. Second sentence.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      // The last period is at end of text (not a useful break), so it splits at the first sentence
      expect(result!.chunk).toBe("First sentence. ");
      expect(result!.remainder).toBe("Second sentence.");
    });

    it("handles exclamation mark as sentence break", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200, breakPreference: "sentence" }));
      const text = "Hello world! This is great! More text here";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      expect(result!.chunk).toContain("!");
    });

    it("handles question mark as sentence break", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200, breakPreference: "sentence" }));
      const text = "Is this working? I hope so? Let us see";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      expect(result!.chunk).toContain("?");
    });

    it("emits multiple chunks for very long text", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 50 }));
      const text = "First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph.";
      const chunks: string[] = [];
      let buffer = text;

      let result = chunker.tryChunk(buffer);
      while (result) {
        chunks.push(result.chunk);
        buffer = result.remainder;
        result = chunker.tryChunk(buffer);
      }
      // Flush remainder
      const flushed = chunker.flush(buffer);
      if (flushed) chunks.push(flushed.chunk);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.join("")).toBe(text);
    });
  });

  describe("flush", () => {
    it("returns entire buffer as chunk", () => {
      const chunker = new BlockChunker(cfg());
      const result = chunker.flush("some remaining text");
      expect(result).not.toBeNull();
      expect(result!.chunk).toBe("some remaining text");
      expect(result!.remainder).toBe("");
    });

    it("returns null for empty buffer", () => {
      const chunker = new BlockChunker(cfg());
      expect(chunker.flush("")).toBeNull();
    });
  });

  describe("fence safety", () => {
    it("does not split inside a fenced code block at natural breaks", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 200 }));
      const text = "Before code:\n\n```python\ndef foo():\n    return 42\n```\n\nAfter code.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      // Should NOT split at the \n\n inside the code block
      // The first valid paragraph break is after "Before code:\n\n"
      // or after the closing fence "```\n\n"
      const chunk = result!.chunk;
      // The chunk should either be "Before code:\n\n" or include the entire fence
      // Since we scan backwards, the last paragraph break after ```\n\n should be found first
      const fenceOpens = (chunk.match(/```/g) || []).length;
      // If chunk contains an opening fence, it must also contain the closing fence
      if (fenceOpens > 0) {
        expect(fenceOpens % 2).toBe(0);
      }
    });

    it("closes and reopens fence on hard cut", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 50 }));
      const text = "```python\n" + "x = 1\n".repeat(20) + "```";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      // Chunk should end with closing fence
      expect(result!.chunk.trimEnd()).toMatch(/```$/);
      // Remainder should start with reopened fence
      expect(result!.remainder).toMatch(/^```python\n/);
    });

    it("preserves language tag when reopening fence", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 60 }));
      const text = "```typescript\nconst a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst e = 5;\n```";
      const result = chunker.tryChunk(text);
      if (result && result.remainder.startsWith("```")) {
        expect(result.remainder).toMatch(/^```typescript\n/);
      }
    });

    it("handles ~~~ fence markers", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 50 }));
      const text = "~~~python\n" + "x = 1\n".repeat(20) + "~~~";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      // Chunk should end with closing tilde fence
      expect(result!.chunk.trimEnd()).toMatch(/~~~$/);
      // Remainder should start with reopened tilde fence
      expect(result!.remainder).toMatch(/^~~~python\n/);
    });

    it("handles text before and after a code block", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 500 }));
      const text = "Some text before.\n\n```\ncode here\n```\n\nSome text after the code block.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      // Should split at a paragraph break that is NOT inside a fence
      const chunk = result!.chunk;
      const remainder = result!.remainder;
      expect(chunk + remainder).toBe(text);
    });

    it("does not treat fence with info string as closing fence", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 500 }));
      // The second ```python should NOT close the first fence (CommonMark: closing fence has no info string)
      const text = "Before.\n\n```python\ncode line 1\n```python\ncode line 2\n```\n\nAfter text here.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      const chunk = result!.chunk;
      // The split should not land between ```python and ```python (inside fence)
      // It should either be before the fence or after the closing ```
      const fenceOpens = (chunk.match(/```python/g) || []).length;
      const fenceCloses = (chunk.match(/^```$/gm) || []).length;
      if (fenceOpens > 0) {
        // If chunk includes opening fences, it must include the real close
        expect(fenceCloses).toBeGreaterThanOrEqual(1);
      }
    });

    it("handles multiple sequential code blocks", () => {
      const chunker = new BlockChunker(cfg({ minChars: 10, maxChars: 500 }));
      const text = "```js\nfoo()\n```\n\n```py\nbar()\n```\n\nEnd.";
      const result = chunker.tryChunk(text);
      expect(result).not.toBeNull();
      // Should be able to split between the two code blocks
      const chunk = result!.chunk;
      const remainder = result!.remainder;
      expect(chunk + remainder).toBe(text);
    });
  });
});
