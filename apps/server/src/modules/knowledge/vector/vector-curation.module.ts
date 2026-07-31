import {
  DynamicModule,
  Module,
  type ClassProvider,
  type ExistingProvider,
  type FactoryProvider,
  type ValueProvider,
} from "@nestjs/common";
import { QueueModule } from "../../../common/queue/index.js";
import { ChunkerService } from "./chunker.service.js";
import { EMBEDDING_PROVIDER, type IEmbeddingProvider } from "./embedding.provider.js";
import { SearchService } from "./search.service.js";
import { VectorCurationProcessor } from "./vector-curation.processor.js";
import { VectorCurationService } from "./vector-curation.service.js";

export type EmbeddingProviderRegistration =
  | Omit<ClassProvider<IEmbeddingProvider>, "provide">
  | Omit<ValueProvider<IEmbeddingProvider>, "provide">
  | Omit<FactoryProvider<IEmbeddingProvider>, "provide">
  | Omit<ExistingProvider<IEmbeddingProvider>, "provide">;

@Module({})
export class VectorCurationModule {
  static register(embeddingProvider: EmbeddingProviderRegistration): DynamicModule {
    return {
      module: VectorCurationModule,
      imports: [QueueModule],
      providers: [
        { provide: EMBEDDING_PROVIDER, ...embeddingProvider },
        ChunkerService,
        SearchService,
        VectorCurationService,
        VectorCurationProcessor,
      ],
      exports: [EMBEDDING_PROVIDER, ChunkerService, SearchService, VectorCurationService],
    };
  }
}
