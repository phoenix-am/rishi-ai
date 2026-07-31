export {
  VectorCurationModule,
  type EmbeddingProviderRegistration,
} from "./vector-curation.module.js";
export { VectorCurationService } from "./vector-curation.service.js";
export { VectorCurationProcessor } from "./vector-curation.processor.js";
export { ChunkerService } from "./chunker.service.js";
export { SearchService } from "./search.service.js";
export {
  EMBEDDING_PROVIDER,
  type IEmbeddingProvider,
  type EmbeddingProviderMetadata,
} from "./embedding.provider.js";
export {
  VECTOR_CURATION_TASK,
  VECTOR_CURATION_PAYLOAD_VERSION,
  VECTOR_CURATION_SCHEMA_VERSION,
  curateDocumentInputSchema,
  type ChunkerConfig,
  type ChunkPayload,
  type CurateDocumentInput,
  type VectorCurationResult,
  type VectorSearchResult,
  type ISearchService,
} from "./vector.contracts.js";
export {
  VectorCurationException,
  InvalidVectorInputException,
  EmbeddingDimensionMismatchException,
  KnowledgeAssetUnavailableException,
  EmbeddingApiException,
} from "./vector.errors.js";
