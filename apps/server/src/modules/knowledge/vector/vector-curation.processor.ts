import { Inject, Injectable } from "@nestjs/common";
import type { JobHelpers } from "graphile-worker";
import { z } from "zod";
import {
  AdvisoryLockService,
  FatalExecutionException,
  ProcessTask,
  TransientExecutionException,
  type JobPayloadVersionWrapper,
} from "../../../common/queue/index.js";
import {
  curateDocumentInputSchema,
  VECTOR_CURATION_PAYLOAD_VERSION,
  VECTOR_CURATION_SCHEMA_VERSION,
  VECTOR_CURATION_TASK,
} from "./vector.contracts.js";
import { EmbeddingApiException, VectorCurationException } from "./vector.errors.js";
import { VectorCurationService } from "./vector-curation.service.js";

@Injectable()
export class VectorCurationProcessor {
  constructor(
    @Inject(VectorCurationService) private readonly curation: VectorCurationService,
    @Inject(AdvisoryLockService) private readonly locks: AdvisoryLockService
  ) {}

  @ProcessTask(VECTOR_CURATION_TASK)
  async process(payload: JobPayloadVersionWrapper, helpers: JobHelpers): Promise<void> {
    try {
      if (
        payload.payloadVersion !== VECTOR_CURATION_PAYLOAD_VERSION ||
        payload.schemaVersion !== VECTOR_CURATION_SCHEMA_VERSION
      ) {
        throw new FatalExecutionException("Vector curation payload version is unsupported.");
      }
      const input = curateDocumentInputSchema.parse(payload.data);
      if (!(await this.locks.tryAcquireLock(input.assetId))) {
        throw new TransientExecutionException("Vector curation is already active for this asset.");
      }
      await this.curation.curate(input, helpers.abortSignal);
    } catch (error) {
      if (
        error instanceof FatalExecutionException ||
        error instanceof TransientExecutionException
      ) {
        throw error;
      }
      if (error instanceof EmbeddingApiException) {
        throw new TransientExecutionException(error.message);
      }
      if (error instanceof VectorCurationException || error instanceof z.ZodError) {
        throw new FatalExecutionException(
          error instanceof Error ? error.message : "Vector curation input is invalid."
        );
      }
      throw new TransientExecutionException("Vector curation failed and will be retried.");
    }
  }
}
