import { describe, expect, it } from "vitest";
import { ChunkerService } from "./chunker.service.js";
import { InvalidVectorInputException } from "./vector.errors.js";

describe("ChunkerService", () => {
  const service = new ChunkerService();

  it("creates deterministic ordered chunks with the configured overlap", () => {
    const input = "one two three four five six seven eight";
    const first = service.splitText(input, { maxTokenSize: 4, overlapTokens: 2 });
    const second = service.splitText(input, { maxTokenSize: 4, overlapTokens: 2 });

    expect(first).toEqual(second);
    expect(first).toEqual([
      { text: "one two three four", index: 0, tokenCount: 4 },
      { text: "three four five six", index: 1, tokenCount: 4 },
      { text: "five six seven eight", index: 2, tokenCount: 4 },
    ]);
  });

  it("returns no chunks for empty content and one chunk for small content", () => {
    expect(service.splitText("  \n ", { maxTokenSize: 4, overlapTokens: 1 })).toEqual([]);
    expect(service.splitText("one two", { maxTokenSize: 4, overlapTokens: 1 })).toEqual([
      { text: "one two", index: 0, tokenCount: 2 },
    ]);
  });

  it("rejects invalid overlap configuration", () => {
    expect(() => service.splitText("one two", { maxTokenSize: 2, overlapTokens: 2 })).toThrow(
      InvalidVectorInputException
    );
  });
});
