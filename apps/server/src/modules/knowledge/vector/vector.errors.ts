export class VectorCurationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VectorCurationException";
  }
}

export class InvalidVectorInputException extends VectorCurationException {
  constructor(message: string) {
    super(message);
    this.name = "InvalidVectorInputException";
  }
}

export class EmbeddingDimensionMismatchException extends VectorCurationException {
  constructor(expected: number, actual: number) {
    super(`Embedding dimension mismatch: expected ${expected}, received ${actual}.`);
    this.name = "EmbeddingDimensionMismatchException";
  }
}

export class KnowledgeAssetUnavailableException extends VectorCurationException {
  constructor() {
    super("Knowledge asset is unavailable in the requested workspace or version.");
    this.name = "KnowledgeAssetUnavailableException";
  }
}

export class EmbeddingApiException extends Error {
  constructor(message = "The embedding provider request failed.") {
    super(message);
    this.name = "EmbeddingApiException";
  }
}
