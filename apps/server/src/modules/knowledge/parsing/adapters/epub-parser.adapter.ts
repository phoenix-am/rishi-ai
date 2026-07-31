import { Injectable } from "@nestjs/common";
import * as path from "node:path";
import * as cheerio from "cheerio";
import { strFromU8, type Unzipped } from "fflate";
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
import { extractHtml } from "./html-parser.adapter.js";

const MIME_TYPE = "application/epub+zip";

@Injectable()
export class EpubParserAdapter implements IDocumentParser {
  supportsMimeType(mimeType: string): boolean {
    return mimeType.toLowerCase() === MIME_TYPE;
  }

  async parse(fileBuffer: Buffer): Promise<ParsedDocument> {
    assertNonEmptyBuffer(fileBuffer);
    if (!hasBytes(fileBuffer, "PK")) {
      throw new InvalidDocumentException("EPUB content does not have a ZIP container signature.");
    }

    try {
      const files = unzipDocumentArchive(fileBuffer);
      this.assertEpubMime(files);
      const packagePath = this.findPackagePath(files);
      const packageDocument = this.requiredFile(files, packagePath);
      const $ = cheerio.load(strFromU8(packageDocument), { xmlMode: true });
      const manifest = new Map<string, { path: string; mimeType: string }>();
      $("manifest item").each((_index, item) => {
        const id = $(item).attr("id");
        const href = $(item).attr("href");
        const mimeType = $(item).attr("media-type");
        if (id && href && mimeType) {
          manifest.set(id, { path: this.resolveArchivePath(packagePath, href), mimeType });
        }
      });

      const sections: string[] = [];
      $("spine itemref").each((_index, item) => {
        const id = $(item).attr("idref");
        const content = id ? manifest.get(id) : undefined;
        if (!content) {
          throw new InvalidDocumentException("EPUB spine references a missing manifest item.");
        }
        if (!["application/xhtml+xml", "text/html"].includes(content.mimeType)) {
          throw new InvalidDocumentException("EPUB spine references a non-document manifest item.");
        }
        sections.push(extractHtml(strFromU8(this.requiredFile(files, content.path))).rawText);
      });

      const rawText = normalizeText(sections.filter(Boolean).join("\n\n"));
      const title = optionalText($("metadata dc\\:title, metadata title").first().text());
      const author = optionalText($("metadata dc\\:creator, metadata creator").first().text());
      return {
        rawText,
        metadata: {
          wordCount: countWords(rawText),
          ...(title ? { title } : {}),
          ...(author ? { extractedAuthor: author } : {}),
          mimeType: MIME_TYPE,
        },
      };
    } catch (error) {
      if (error instanceof InvalidDocumentException) throw error;
      throw new DocumentParsingException(MIME_TYPE, { cause: error });
    }
  }

  private assertEpubMime(files: Unzipped): void {
    const mime = files["mimetype"];
    if (!mime || strFromU8(mime).trim() !== MIME_TYPE) {
      throw new InvalidDocumentException("EPUB container has an invalid or missing mimetype.");
    }
  }

  private findPackagePath(files: Unzipped): string {
    const container = this.requiredFile(files, "META-INF/container.xml");
    const $ = cheerio.load(strFromU8(container), { xmlMode: true });
    const packagePath = $("rootfile").first().attr("full-path");
    if (!packagePath) throw new InvalidDocumentException("EPUB container has no package document.");
    return this.normalizeArchivePath(packagePath);
  }

  private resolveArchivePath(packagePath: string, href: string): string {
    let decodedHref: string;
    try {
      decodedHref = decodeURIComponent(href.split(/[?#]/u, 1)[0] ?? "");
    } catch (error) {
      throw new InvalidDocumentException("EPUB manifest contains an invalid content path.", {
        cause: error,
      });
    }
    return this.normalizeArchivePath(path.posix.join(path.posix.dirname(packagePath), decodedHref));
  }

  private normalizeArchivePath(value: string): string {
    const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
    if (
      !normalized ||
      normalized === "." ||
      normalized.startsWith("../") ||
      path.posix.isAbsolute(normalized)
    ) {
      throw new InvalidDocumentException("EPUB contains an unsafe archive path.");
    }
    return normalized;
  }

  private requiredFile(files: Unzipped, filePath: string): Uint8Array {
    const file = files[filePath];
    if (!file) throw new InvalidDocumentException(`EPUB is missing required entry: ${filePath}`);
    return file;
  }
}
