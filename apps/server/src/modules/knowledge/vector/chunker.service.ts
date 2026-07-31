import { Injectable } from "@nestjs/common";
import type { ChunkerConfig, ChunkPayload } from "./vector.contracts.js";
import { InvalidVectorInputException } from "./vector.errors.js";

@Injectable()
export class ChunkerService {
  public splitText(text: string, config: ChunkerConfig): ChunkPayload[] {
    this.validateConfig(config);
    const tokens = text.trim().split(/\s+/u).filter(Boolean);
    if (tokens.length === 0) return [];

    const chunks: ChunkPayload[] = [];
    const step = config.maxTokenSize - config.overlapTokens;
    for (let start = 0; start < tokens.length; start += step) {
      const chunkTokens = tokens.slice(start, start + config.maxTokenSize);
      chunks.push({
        text: chunkTokens.join(" "),
        index: chunks.length,
        tokenCount: chunkTokens.length,
      });
      if (start + config.maxTokenSize >= tokens.length) break;
    }
    return chunks;
  }

  private validateConfig(config: ChunkerConfig): void {
    if (!Number.isInteger(config.maxTokenSize) || config.maxTokenSize < 1) {
      throw new InvalidVectorInputException("Chunk size must be a positive integer.");
    }
    if (
      !Number.isInteger(config.overlapTokens) ||
      config.overlapTokens < 0 ||
      config.overlapTokens >= config.maxTokenSize
    ) {
      throw new InvalidVectorInputException(
        "Chunk overlap must be a non-negative integer smaller than the chunk size."
      );
    }
  }
}
