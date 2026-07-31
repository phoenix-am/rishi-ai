import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import type { IDocumentParser, ParsedDocument } from "../interfaces/document-parser.js";
import {
  assertNonEmptyBuffer,
  countWords,
  decodeUtf8,
  normalizeText,
  optionalText,
} from "../parsing.utils.js";

const MIME_TYPES = new Set(["text/html", "application/xhtml+xml"]);
const BLOCK_ELEMENTS =
  "address,article,aside,blockquote,br,div,footer,h1,h2,h3,h4,h5,h6,header,li,main,nav,p,section,tr";

export interface HtmlExtraction {
  rawText: string;
  title?: string;
  author?: string;
}

export function extractHtml(html: string): HtmlExtraction {
  const $ = cheerio.load(html);
  const title = optionalText($("title").first().text());
  const author = optionalText(
    $('meta[name="author"], meta[property="article:author"]').first().attr("content")
  );
  $("script,style,noscript,template").remove();
  $(BLOCK_ELEMENTS).append("\n");
  return { rawText: normalizeText($("body").text()), title, author };
}

@Injectable()
export class HtmlParserAdapter implements IDocumentParser {
  supportsMimeType(mimeType: string): boolean {
    return MIME_TYPES.has(mimeType.toLowerCase());
  }

  async parse(fileBuffer: Buffer): Promise<ParsedDocument> {
    assertNonEmptyBuffer(fileBuffer);
    const extracted = extractHtml(decodeUtf8(fileBuffer));
    return {
      rawText: extracted.rawText,
      metadata: {
        wordCount: countWords(extracted.rawText),
        ...(extracted.title ? { title: extracted.title } : {}),
        ...(extracted.author ? { extractedAuthor: extracted.author } : {}),
        mimeType: "text/html",
      },
    };
  }
}
