import { describe, expect, it } from "vitest";
import { ChunkerService } from "./chunker.service.js";
import { EMBEDDING_PROVIDER, type IEmbeddingProvider } from "./embedding.provider.js";
import * as vectorPublicApi from "./index.js";
import { SearchService } from "./search.service.js";
import { VectorCurationModule } from "./vector-curation.module.js";
import { VectorCurationService } from "./vector-curation.service.js";

describe("VectorCurationModule", () => {
  it("registers an injected provider and exports the public services", () => {
    const provider: IEmbeddingProvider = {
      generateEmbedding: async () => Array<number>(1536).fill(0),
      getDimension: () => 1536,
      getMetadata: () => ({ provider: "controlled", model: "fixture", version: "v1" }),
    };
    const definition = VectorCurationModule.register({ useValue: provider });

    expect(definition.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: EMBEDDING_PROVIDER, useValue: provider }),
        ChunkerService,
        SearchService,
        VectorCurationService,
      ])
    );
    expect(definition.exports).toEqual(
      expect.arrayContaining([
        EMBEDDING_PROVIDER,
        ChunkerService,
        SearchService,
        VectorCurationService,
      ])
    );
  });

  it("exposes the approved vector-curation public API", () => {
    expect(vectorPublicApi.VectorCurationModule).toBe(VectorCurationModule);
    expect(vectorPublicApi.VectorCurationService).toBe(VectorCurationService);
    expect(vectorPublicApi.SearchService).toBe(SearchService);
    expect(vectorPublicApi.EMBEDDING_PROVIDER).toBe("IEmbeddingProvider");
  });
});
