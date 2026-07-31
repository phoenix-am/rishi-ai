import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { DOCUMENT_PARSERS, type IDocumentParser } from "./interfaces/document-parser.js";
import { ParsingModule } from "./parsing.module.js";
import { ParsingService } from "./parsing.service.js";

describe("ParsingModule", () => {
  it("publishes the parsing service and every documented adapter", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ParsingModule] }).compile();

    const service = moduleRef.get(ParsingService);
    const parsers = moduleRef.get<readonly IDocumentParser[]>(DOCUMENT_PARSERS);

    expect(service).toBeInstanceOf(ParsingService);
    expect(parsers).toHaveLength(5);
    expect([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/html",
      "application/epub+zip",
      "text/plain",
      "text/markdown",
    ]).toSatisfy((mimeTypes: string[]) =>
      mimeTypes.every((mimeType) => parsers.some((parser) => parser.supportsMimeType(mimeType)))
    );

    await moduleRef.close();
  });
});
