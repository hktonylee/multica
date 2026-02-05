/**
 * Block chunker for splitting streaming text at natural boundaries.
 *
 * Used by MessageAggregator to produce appropriately-sized text blocks
 * for messaging platforms that cannot consume raw streaming deltas.
 */

export interface BlockChunkerConfig {
  /** Minimum text chars before attempting a break (default: 200) */
  minChars: number;
  /** Hard maximum chunk size — will force-break here (default: 2000) */
  maxChars: number;
  /** Preferred break type priority */
  breakPreference: "paragraph" | "newline" | "sentence";
}

export const DEFAULT_CHUNKER_CONFIG: BlockChunkerConfig = {
  minChars: 200,
  maxChars: 2000,
  breakPreference: "paragraph",
};

export interface ChunkResult {
  /** Text to emit as a block */
  chunk: string;
  /** Remaining text to keep in buffer */
  remainder: string;
}

interface FenceInfo {
  marker: string; // "```" or "~~~"
  lang: string; // language identifier, e.g. "typescript"
}

/**
 * Detect if `text` has an unclosed fenced code block at the given position.
 * Scans line-by-line tracking fence open/close pairs.
 */
function detectFenceAt(text: string, upTo: number): FenceInfo | null {
  const region = text.slice(0, upTo);
  const lines = region.split("\n");
  let openFence: FenceInfo | null = null;

  for (const line of lines) {
    const match = line.match(/^(`{3,}|~{3,})(\S*)\s*$/);
    if (!match) continue;
    const marker = match[1];
    const lang = match[2] ?? "";
    const markerChar = marker[0];

    if (openFence === null) {
      // Opening a new fence
      openFence = { marker, lang };
    } else if (markerChar === openFence.marker[0] && marker.length >= openFence.marker.length && lang === "") {
      // Closing the current fence (same char, at least as many chars, no info string per CommonMark)
      openFence = null;
    }
    // Otherwise: different char or shorter marker, not a close — ignore
  }

  return openFence;
}

/**
 * Check if position is inside an unclosed fenced code block.
 */
function isInsideFence(text: string, position: number): boolean {
  return detectFenceAt(text, position) !== null;
}

/**
 * If a chunk ends inside an open fence, close it in the chunk
 * and reopen it in the remainder.
 */
function applyFenceSafety(chunk: string, remainder: string): { chunk: string; remainder: string } {
  const fence = detectFenceAt(chunk, chunk.length);
  if (!fence) return { chunk, remainder };

  // Close the fence in the chunk
  const closedChunk = chunk.endsWith("\n")
    ? chunk + fence.marker + "\n"
    : chunk + "\n" + fence.marker + "\n";

  // Reopen the fence in the remainder
  const reopenTag = fence.lang ? `${fence.marker}${fence.lang}` : fence.marker;
  const reopenedRemainder = reopenTag + "\n" + remainder;

  return { chunk: closedChunk, remainder: reopenedRemainder };
}

export class BlockChunker {
  private readonly minChars: number;
  private readonly maxChars: number;
  private readonly breakPreference: "paragraph" | "newline" | "sentence";

  constructor(config: BlockChunkerConfig) {
    this.minChars = config.minChars;
    this.maxChars = config.maxChars;
    this.breakPreference = config.breakPreference;
  }

  /**
   * Attempt to extract a chunk from the buffer.
   * Returns null if buffer is below minChars or no suitable break found
   * (unless buffer exceeds maxChars, in which case a hard break is forced).
   */
  tryChunk(buffer: string): ChunkResult | null {
    if (buffer.length < this.minChars) return null;

    // Search window: minChars..min(buffer.length, maxChars)
    const searchEnd = Math.min(buffer.length, this.maxChars);
    const breakIndex = this.findBreakIndex(buffer, this.minChars, searchEnd);

    if (breakIndex !== -1) {
      return {
        chunk: buffer.slice(0, breakIndex),
        remainder: buffer.slice(breakIndex),
      };
    }

    // No break found within search window
    if (buffer.length >= this.maxChars) {
      // Hard cut at maxChars with fence safety
      const raw = {
        chunk: buffer.slice(0, this.maxChars),
        remainder: buffer.slice(this.maxChars),
      };
      return applyFenceSafety(raw.chunk, raw.remainder);
    }

    // Buffer is between minChars and maxChars with no break — wait for more text
    return null;
  }

  /**
   * Force-flush: return entire buffer as a chunk.
   */
  flush(buffer: string): ChunkResult | null {
    if (buffer.length === 0) return null;
    return { chunk: buffer, remainder: "" };
  }

  /**
   * Find the best break index in the buffer within [searchStart, searchEnd).
   * Scans backwards from searchEnd to prefer later breaks (larger chunks).
   * Returns the index AFTER the break character(s) — i.e., the start of the remainder.
   * Returns -1 if no suitable break found.
   */
  private findBreakIndex(buffer: string, searchStart: number, searchEnd: number): number {
    const breakers = this.getBreakers();
    const bufLen = buffer.length;

    for (const breaker of breakers) {
      const index = breaker(buffer, searchStart, searchEnd, bufLen);
      if (index !== -1 && !isInsideFence(buffer, index)) {
        return index;
      }
    }

    return -1;
  }

  /**
   * Get break functions in priority order based on breakPreference.
   */
  private getBreakers(): Array<(buffer: string, start: number, end: number, bufLen: number) => number> {
    switch (this.breakPreference) {
      case "paragraph":
        return [findParagraphBreak, findNewlineBreak, findSentenceBreak, findWordBreak];
      case "newline":
        return [findNewlineBreak, findSentenceBreak, findWordBreak];
      case "sentence":
        return [findSentenceBreak, findWordBreak];
    }
  }
}

/**
 * Find a paragraph break (\n\n) scanning backwards from end.
 * Returns the index after the break (start of next paragraph).
 */
function findParagraphBreak(buffer: string, start: number, end: number, bufLen: number): number {
  for (let i = end - 1; i >= start + 1; i--) {
    if (buffer[i] === "\n" && buffer[i - 1] === "\n") {
      const idx = i + 1;
      if (idx < bufLen) return idx;
    }
  }
  return -1;
}

/**
 * Find a newline break (\n) scanning backwards from end.
 * Returns the index after the newline.
 */
function findNewlineBreak(buffer: string, start: number, end: number, bufLen: number): number {
  for (let i = end - 1; i >= start; i--) {
    if (buffer[i] === "\n") {
      const idx = i + 1;
      if (idx < bufLen) return idx;
    }
  }
  return -1;
}

/**
 * Find a sentence break (.!? followed by whitespace or end of string).
 * Returns the index after the whitespace following the punctuation.
 */
function findSentenceBreak(buffer: string, start: number, end: number, bufLen: number): number {
  for (let i = end - 1; i >= start; i--) {
    const ch = buffer[i];
    if (ch === "." || ch === "!" || ch === "?") {
      const next = i + 1;
      if (next < bufLen && /\s/.test(buffer[next])) {
        // Break after the whitespace
        const idx = next + 1;
        if (idx < bufLen) return idx;
      } else if (next >= bufLen) {
        // Punctuation at end of text — not a useful split point, skip
        continue;
      }
    }
  }
  return -1;
}

/**
 * Find a word boundary (whitespace) scanning backwards from end.
 * Returns the index after the whitespace character.
 */
function findWordBreak(buffer: string, start: number, end: number, bufLen: number): number {
  for (let i = end - 1; i >= start; i--) {
    if (/\s/.test(buffer[i])) {
      const idx = i + 1;
      if (idx < bufLen) return idx;
    }
  }
  return -1;
}
