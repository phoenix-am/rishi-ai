import { Injectable } from "@nestjs/common";
import type { IDocumentParser, ParsedDocument } from "../interfaces/document-parser.js";
import {
  assertNonEmptyBuffer,
  countWords,
  decodeUtf8,
  normalizeText,
  optionalText,
} from "../parsing.utils.js";

const MIME_TYPES = new Set(["text/plain", "text/markdown", "text/x-markdown"]);

@Injectable()
export class TextParserAdapter implements IDocumentParser {
  supportsMimeType(mimeType: string): boolean {
    return MIME_TYPES.has(mimeType.toLowerCase());
  }

  async parse(fileBuffer: Buffer): Promise<ParsedDocument> {
    assertNonEmptyBuffer(fileBuffer);
    const rawText = normalizeText(decodeUtf8(fileBuffer));
    const firstLine = rawText.split("\n", 1)[0];
    const markdownTitle = firstLine?.match(/^#\s+(.+)$/u)?.[1];
    const title = optionalText(markdownTitle);

    return {
      rawText,
      metadata: {
        wordCount: countWords(rawText),
        ...(title ? { title } : {}),
        mimeType: markdownTitle ? "text/markdown" : "text/plain",
      },
    };
  }
}
