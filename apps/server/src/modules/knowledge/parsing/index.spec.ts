import { describe, expect, it } from "vitest";
import {
  DOCUMENT_PARSERS,
  DocumentParsingException,
  InvalidDocumentException,
  ParsingModule,
  ParsingService,
} from "./index.js";

describe("parsing public API", () => {
  it("exports the stable module boundary without concrete providers", () => {
    expect(ParsingModule).toBeDefined();
    expect(ParsingService).toBeDefined();
    expect(DOCUMENT_PARSERS).toBeDefined();
    expect(InvalidDocumentException).toBeDefined();
    expect(DocumentParsingException).toBeDefined();
  });
});
