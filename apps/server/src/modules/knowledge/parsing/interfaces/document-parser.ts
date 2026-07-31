export interface ParsedDocumentMetadata {
  pageCount?: number;
  wordCount: number;
  title?: string;
  extractedAuthor?: string;
  mimeType: string;
}

export interface ParsedDocument {
  rawText: string;
  metadata: ParsedDocumentMetadata;
}

/** Format-specific adapter contract used by the parsing router. */
export interface IDocumentParser {
  supportsMimeType(mimeType: string): boolean;
  parse(fileBuffer: Buffer): Promise<ParsedDocument>;
}

export const DOCUMENT_PARSERS = Symbol.for("rishi.parsing.document-parsers");
