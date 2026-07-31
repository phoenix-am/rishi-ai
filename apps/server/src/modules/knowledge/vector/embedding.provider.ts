export const EMBEDDING_PROVIDER = "IEmbeddingProvider";

export interface EmbeddingProviderMetadata {
  provider: string;
  model: string;
  version: string;
}

export interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  getDimension(): number;
  getMetadata(): EmbeddingProviderMetadata;
}
