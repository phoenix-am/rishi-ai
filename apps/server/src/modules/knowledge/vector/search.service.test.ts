import type { ConfigService, EnvConfig } from "@rishi/config";
import type { DatabaseService } from "@rishi/database";
import { describe, expect, it } from "vitest";
import { SearchService } from "./search.service.js";
import {
  EmbeddingDimensionMismatchException,
  InvalidVectorInputException,
} from "./vector.errors.js";

const config = {
  get: <T extends keyof EnvConfig>(key: T) =>
    ({ VECTOR_EMBEDDING_DIMENSION: 1536, VECTOR_SEARCH_MAX_RESULTS: 10 })[
      key as string
    ] as EnvConfig[T],
} as ConfigService;

function createDatabase() {
  const rows = [
    {
      chunkId: "11111111-1111-4111-8111-111111111111",
      assetId: "22222222-2222-4222-8222-222222222222",
      chunkText: "grounded text",
      cosineDistance: "0.25",
    },
  ];
  const client = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: () => ({ limit: async () => rows }),
            }),
          }),
        }),
      }),
    }),
  };
  return { client } as unknown as DatabaseService;
}

describe("SearchService", () => {
  it("maps project-scoped cosine distance results to relevance scores", async () => {
    const service = new SearchService(createDatabase(), config);
    const results = await service.querySemanticChunks(
      "33333333-3333-4333-8333-333333333333",
      Array<number>(1536).fill(0),
      5
    );
    expect(results).toEqual([
      {
        chunkId: "11111111-1111-4111-8111-111111111111",
        assetId: "22222222-2222-4222-8222-222222222222",
        chunkText: "grounded text",
        cosineDistance: 0.25,
        relevanceScore: 75,
      },
    ]);
  });

  it("rejects incorrect dimensions and unsafe limits before querying", async () => {
    const service = new SearchService(createDatabase(), config);
    await expect(
      service.querySemanticChunks("33333333-3333-4333-8333-333333333333", [0, 1], 5)
    ).rejects.toBeInstanceOf(EmbeddingDimensionMismatchException);
    await expect(
      service.querySemanticChunks(
        "33333333-3333-4333-8333-333333333333",
        Array<number>(1536).fill(0),
        11
      )
    ).rejects.toBeInstanceOf(InvalidVectorInputException);
    const invalid = Array<number>(1536).fill(0);
    invalid[0] = Number.NaN;
    await expect(
      service.querySemanticChunks("33333333-3333-4333-8333-333333333333", invalid, 5)
    ).rejects.toBeInstanceOf(InvalidVectorInputException);
  });
});
