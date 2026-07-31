import { Injectable } from "@nestjs/common";
import { extractText, getDocumentProxy, getMeta } from "unpdf";
import type { IDocumentParser, ParsedDocument } from "../interfaces/document-parser.js";
import { DocumentParsingException, InvalidDocumentException } from "../parsing.errors.js";
import {
  assertNonEmptyBuffer,
  countWords,
  hasBytes,
  normalizeText,
  optionalText,
} from "../parsing.utils.js";

const MIME_TYPE = "application/pdf";

@Injectable()
export class PdfParserAdapter implements IDocumentParser {
  supportsMimeType(mimeType: string): boolean {
    return mimeType.toLowerCase() === MIME_TYPE;
  }

  async parse(fileBuffer: Buffer): Promise<ParsedDocument> {
    assertNonEmptyBuffer(fileBuffer);
    if (!hasBytes(fileBuffer, "%PDF-")) {
      throw new InvalidDocumentException("PDF content does not have a PDF signature.");
    }

    let document: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
    try {
      document = await getDocumentProxy(new Uint8Array(fileBuffer));
      const [{ totalPages, text }, metadata] = await Promise.all([
        extractText(document, { mergePages: true }),
        getMeta(document),
      ]);
      const rawText = normalizeText(text);
      const title = optionalText(metadata.info["Title"]);
      const author = optionalText(metadata.info["Author"]);
      return {
        rawText,
        metadata: {
          pageCount: totalPages,
          wordCount: countWords(rawText),
          ...(title ? { title } : {}),
          ...(author ? { extractedAuthor: author } : {}),
          mimeType: MIME_TYPE,
        },
      };
    } catch (error) {
      if (error instanceof InvalidDocumentException) throw error;
      throw new DocumentParsingException(MIME_TYPE, { cause: error });
    } finally {
      const destroyable = document as { destroy?: () => Promise<void> } | undefined;
      await destroyable?.destroy?.();
    }
  }
}
