export class InvalidDocumentException extends Error {
  public readonly code = "INVALID_DOCUMENT";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidDocumentException";
  }
}

export class DocumentParsingException extends Error {
  public readonly code = "DOCUMENT_PARSING_FAILED";

  constructor(
    public readonly mimeType: string,
    options?: ErrorOptions
  ) {
    super(`The ${mimeType} document could not be parsed.`, options);
    this.name = "DocumentParsingException";
  }
}
