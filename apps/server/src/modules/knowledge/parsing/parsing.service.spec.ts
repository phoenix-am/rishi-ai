import { UnsupportedMediaTypeException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { IDocumentParser } from "./interfaces/document-parser.js";
import { InvalidDocumentException } from "./parsing.errors.js";
import { ParsingService } from "./parsing.service.js";

describe("ParsingService", () => {
  it("routes normalized MIME types to the matching adapter", async () => {
    const pdfParser: IDocumentParser = {
      supportsMimeType: (mimeType) => mimeType === "application/pdf",
      parse: vi.fn().mockResolvedValue({
        rawText: "PDF content",
        metadata: { wordCount: 2, mimeType: "application/pdf" },
      }),
    };
    const textParser: IDocumentParser = {
      supportsMimeType: (mimeType) => mimeType === "text/plain",
      parse: vi.fn(),
    };
    const service = new ParsingService([pdfParser, textParser]);

    const result = await service.parseDocument(
      Buffer.from("pdf"),
      " Application/PDF ; charset=binary"
    );

    expect(result.rawText).toBe("PDF content");
    expect(result.metadata.mimeType).toBe("application/pdf");
    expect(pdfParser.parse).toHaveBeenCalledOnce();
    expect(textParser.parse).not.toHaveBeenCalled();
  });

  it("rejects unsupported media types deterministically", async () => {
    const service = new ParsingService([]);

    await expect(service.parseDocument(Buffer.from("image"), "image/png")).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException
    );
  });

  it("rejects empty document content before adapter selection", async () => {
    const service = new ParsingService([]);

    await expect(service.parseDocument(Buffer.alloc(0), "text/plain")).rejects.toBeInstanceOf(
      InvalidDocumentException
    );
  });
});
