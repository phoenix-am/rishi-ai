import type { JobHelpers } from "graphile-worker";
import { describe, expect, it, vi } from "vitest";
import {
  AdvisoryLockService,
  FatalExecutionException,
  TransientExecutionException,
} from "../../../common/queue/index.js";
import type { CurateDocumentInput } from "./vector.contracts.js";
import { EmbeddingApiException } from "./vector.errors.js";
import { VectorCurationProcessor } from "./vector-curation.processor.js";
import type { VectorCurationService } from "./vector-curation.service.js";

const input: CurateDocumentInput = {
  assetId: "11111111-1111-4111-8111-111111111111",
  workspaceId: "22222222-2222-4222-8222-222222222222",
  assetVersion: 1,
  parsedDocument: {
    rawText: "content",
    metadata: { wordCount: 1, mimeType: "text/plain" },
  },
};
const payload = { payloadVersion: "1.0.0", schemaVersion: "1", data: { ...input } };
const helpers = { abortSignal: new AbortController().signal } as JobHelpers;

describe("VectorCurationProcessor", () => {
  it("serializes duplicate asset jobs and delegates valid work", async () => {
    const curation = { curate: vi.fn(async () => undefined) } as unknown as VectorCurationService;
    const locks = { tryAcquireLock: vi.fn(async () => true) };
    const processor = new VectorCurationProcessor(
      curation,
      locks as unknown as AdvisoryLockService
    );

    await processor.process(payload, helpers);
    expect(locks.tryAcquireLock).toHaveBeenCalledWith(input.assetId);
    expect(curation.curate).toHaveBeenCalledWith(input, helpers.abortSignal);
  });

  it("turns provider failures into retryable execution failures", async () => {
    const curation = {
      curate: vi.fn(async () => {
        throw new EmbeddingApiException();
      }),
    } as unknown as VectorCurationService;
    const processor = new VectorCurationProcessor(curation, {
      tryAcquireLock: vi.fn(async () => true),
    } as unknown as AdvisoryLockService);

    await expect(processor.process(payload, helpers)).rejects.toBeInstanceOf(
      TransientExecutionException
    );
  });

  it("rejects unsupported payload versions as fatal", async () => {
    const processor = new VectorCurationProcessor(
      { curate: vi.fn() } as unknown as VectorCurationService,
      { tryAcquireLock: vi.fn(async () => true) } as unknown as AdvisoryLockService
    );

    await expect(
      processor.process({ ...payload, payloadVersion: "2.0.0" }, helpers)
    ).rejects.toBeInstanceOf(FatalExecutionException);
  });

  it("retries when another worker owns the asset lock", async () => {
    const processor = new VectorCurationProcessor(
      { curate: vi.fn() } as unknown as VectorCurationService,
      { tryAcquireLock: vi.fn(async () => false) } as unknown as AdvisoryLockService
    );
    await expect(processor.process(payload, helpers)).rejects.toBeInstanceOf(
      TransientExecutionException
    );
  });
});
