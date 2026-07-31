import { Inject, Injectable, UnsupportedMediaTypeException } from "@nestjs/common";
import {
  DOCUMENT_PARSERS,
  type IDocumentParser,
  type ParsedDocument,
} from "./interfaces/document-parser.js";
import { assertNonEmptyBuffer } from "./parsing.utils.js";

@Injectable()
export class ParsingService {
  constructor(@Inject(DOCUMENT_PARSERS) private readonly parsers: readonly IDocumentParser[]) {}

  async parseDocument(fileBuffer: Buffer, mimeType: string): Promise<ParsedDocument> {
    assertNonEmptyBuffer(fileBuffer);
    const normalizedMimeType = mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    const parser = this.parsers.find((candidate) => candidate.supportsMimeType(normalizedMimeType));
    if (!parser) {
      throw new UnsupportedMediaTypeException(
        `No parser registered for media type: ${normalizedMimeType || "unspecified"}`
      );
    }
    const parsed = await parser.parse(fileBuffer);
    return {
      ...parsed,
      metadata: { ...parsed.metadata, mimeType: normalizedMimeType },
    };
  }
}
