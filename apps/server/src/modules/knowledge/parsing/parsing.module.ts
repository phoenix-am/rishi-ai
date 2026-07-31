import { Module } from "@nestjs/common";
import { DocxParserAdapter } from "./adapters/docx-parser.adapter.js";
import { EpubParserAdapter } from "./adapters/epub-parser.adapter.js";
import { HtmlParserAdapter } from "./adapters/html-parser.adapter.js";
import { PdfParserAdapter } from "./adapters/pdf-parser.adapter.js";
import { TextParserAdapter } from "./adapters/text-parser.adapter.js";
import { DOCUMENT_PARSERS, type IDocumentParser } from "./interfaces/document-parser.js";
import { ParsingService } from "./parsing.service.js";

const ADAPTERS = [
  PdfParserAdapter,
  DocxParserAdapter,
  HtmlParserAdapter,
  EpubParserAdapter,
  TextParserAdapter,
] as const;

@Module({
  providers: [
    ...ADAPTERS,
    {
      provide: DOCUMENT_PARSERS,
      useFactory: (...parsers: IDocumentParser[]) => parsers,
      inject: [...ADAPTERS],
    },
    ParsingService,
  ],
  exports: [DOCUMENT_PARSERS, ParsingService],
})
export class ParsingModule {}
