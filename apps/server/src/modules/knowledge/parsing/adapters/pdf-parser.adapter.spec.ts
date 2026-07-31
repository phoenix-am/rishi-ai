import { describe, expect, it } from "vitest";
import { InvalidDocumentException } from "../parsing.errors.js";
import { PdfParserAdapter } from "./pdf-parser.adapter.js";

function createPdfFixture(): Buffer {
  const stream = "BT\n/F1 12 Tf\n72 720 Td\n(Hello PDF world) Tj\nET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Title (PDF Fixture) /Author (Fixture Author) >>",
  ];
  let body = "%PDF-1.4\n%fixture\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(body, "latin1");
  const xrefEntries = offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("");
  body +=
    `xref\n0 ${objects.length + 1}\n` +
    `0000000000 65535 f \n${xrefEntries}` +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

describe("PdfParserAdapter", () => {
  it("extracts PDF text, page count, and document metadata", async () => {
    const result = await new PdfParserAdapter().parse(createPdfFixture());

    expect(result.rawText).toContain("Hello PDF world");
    expect(result.metadata).toEqual({
      pageCount: 1,
      wordCount: 3,
      title: "PDF Fixture",
      extractedAuthor: "Fixture Author",
      mimeType: "application/pdf",
    });
  });

  it("rejects content without a PDF signature", async () => {
    await expect(new PdfParserAdapter().parse(Buffer.from("not a pdf"))).rejects.toBeInstanceOf(
      InvalidDocumentException
    );
  });
});
