import { Injectable } from "@nestjs/common";
import mammoth from "mammoth";
import { strFromU8, type Unzipped } from "fflate";
import * as cheerio from "cheerio";
import type { IDocumentParser, ParsedDocument } from "../interfaces/document-parser.js";
import { DocumentParsingException, InvalidDocumentException } from "../parsing.errors.js";
import {
  assertNonEmptyBuffer,
  countWords,
  hasBytes,
  normalizeText,
  optionalText,
  unzipDocumentArchive,
} from "../parsing.utils.js";

const MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

@Injectable()
export class DocxParserAdapter implements IDocumentParser {
  supportsMimeType(mimeType: string): boolean {
    return mimeType.toLowerCase() === MIME_TYPE;
  }

  async parse(fileBuffer: Buffer): Promise<ParsedDocument> {
    assertNonEmptyBuffer(fileBuffer);
    if (!hasBytes(fileBuffer, "PK")) {
      throw new InvalidDocumentException("DOCX content does not have a ZIP container signature.");
    }

    try {
      const files = unzipDocumentArchive(fileBuffer);
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const extractionError = result.messages.find((message) => message.type === "error");
      if (extractionError) {
        throw new InvalidDocumentException("DOCX extraction reported invalid document content.", {
          cause: extractionError.error,
        });
      }
      const rawText = normalizeText(result.value);
      const core = this.readCoreProperties(files);
      return {
        rawText,
        metadata: {
          wordCount: countWords(rawText),
          ...(core.title ? { title: core.title } : {}),
          ...(core.author ? { extractedAuthor: core.author } : {}),
          mimeType: MIME_TYPE,
        },
      };
    } catch (error) {
      if (error instanceof InvalidDocumentException) throw error;
      throw new DocumentParsingException(MIME_TYPE, { cause: error });
    }
  }

  private readCoreProperties(files: Unzipped): { title?: string; author?: string } {
    const coreProperties = files["docProps/core.xml"];
    if (!coreProperties) return {};
    const $ = cheerio.load(strFromU8(coreProperties), { xmlMode: true });
    return {
      title: optionalText($("dc\\:title, title").first().text()),
      author: optionalText($("dc\\:creator, creator").first().text()),
    };
  }
}
