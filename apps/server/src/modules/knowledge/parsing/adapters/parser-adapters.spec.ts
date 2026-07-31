import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { DocxParserAdapter } from "./docx-parser.adapter.js";
import { EpubParserAdapter } from "./epub-parser.adapter.js";
import { HtmlParserAdapter } from "./html-parser.adapter.js";
import { TextParserAdapter } from "./text-parser.adapter.js";
import { DocumentParsingException, InvalidDocumentException } from "../parsing.errors.js";

describe("text document adapters", () => {
  it("normalizes plain text deterministically", async () => {
    const result = await new TextParserAdapter().parse(
      Buffer.from("First  line\r\n\r\n\r\nSecond line\tend")
    );

    expect(result).toEqual({
      rawText: "First line\n\nSecond line end",
      metadata: { wordCount: 5, mimeType: "text/plain" },
    });
  });

  it("extracts a Markdown heading as title without discarding source text", async () => {
    const result = await new TextParserAdapter().parse(
      Buffer.from("# A Reliable Title\n\nBody content")
    );

    expect(result.rawText).toBe("# A Reliable Title\n\nBody content");
    expect(result.metadata).toMatchObject({
      title: "A Reliable Title",
      mimeType: "text/markdown",
      wordCount: 5,
    });
  });

  it("rejects text that is not valid UTF-8", async () => {
    await expect(new TextParserAdapter().parse(Buffer.from([0xc3, 0x28]))).rejects.toBeInstanceOf(
      InvalidDocumentException
    );
  });

  it("extracts visible HTML text and metadata while excluding executable content", async () => {
    const result = await new HtmlParserAdapter().parse(
      Buffer.from(
        '<html><head><title>History</title><meta name="author" content="Rishi"></head>' +
          "<body><h1>Opening</h1><p>Useful text.</p><script>hidden()</script></body></html>"
      )
    );

    expect(result.rawText).toBe("Opening\nUseful text.");
    expect(result.metadata).toEqual({
      title: "History",
      extractedAuthor: "Rishi",
      wordCount: 3,
      mimeType: "text/html",
    });
  });
});

describe("container document adapters", () => {
  it("extracts DOCX body text and core metadata", async () => {
    const docx = zipSync({
      "[Content_Types].xml": strToU8(
        '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
          "</Types>"
      ),
      "_rels/.rels": strToU8(
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          "</Relationships>"
      ),
      "word/document.xml": strToU8(
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
          "<w:body><w:p><w:r><w:t>Document body text</w:t></w:r></w:p></w:body></w:document>"
      ),
      "docProps/core.xml": strToU8(
        '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
          'xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Document Title</dc:title>' +
          "<dc:creator>Document Author</dc:creator></cp:coreProperties>"
      ),
    });

    const result = await new DocxParserAdapter().parse(Buffer.from(docx));

    expect(result.rawText).toBe("Document body text");
    expect(result.metadata).toEqual({
      title: "Document Title",
      extractedAuthor: "Document Author",
      wordCount: 3,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  it("rejects malformed DOCX containers", async () => {
    await expect(new DocxParserAdapter().parse(Buffer.from("PK-invalid"))).rejects.toBeInstanceOf(
      DocumentParsingException
    );
  });

  it("extracts EPUB spine content in declared order", async () => {
    const epub = zipSync({
      mimetype: [strToU8("application/epub+zip"), { level: 0 }],
      "META-INF/container.xml": strToU8(
        '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>'
      ),
      "OEBPS/content.opf": strToU8(
        '<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata>' +
          "<dc:title>EPUB Title</dc:title><dc:creator>EPUB Author</dc:creator></metadata><manifest>" +
          '<item id="one" href="one.xhtml" media-type="application/xhtml+xml"/>' +
          '<item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest>' +
          '<spine><itemref idref="two"/><itemref idref="one"/></spine></package>'
      ),
      "OEBPS/one.xhtml": strToU8("<html><body><p>First chapter.</p></body></html>"),
      "OEBPS/two.xhtml": strToU8("<html><body><p>Second chapter.</p></body></html>"),
    });

    const result = await new EpubParserAdapter().parse(Buffer.from(epub));

    expect(result.rawText).toBe("Second chapter.\n\nFirst chapter.");
    expect(result.metadata).toEqual({
      title: "EPUB Title",
      extractedAuthor: "EPUB Author",
      wordCount: 4,
      mimeType: "application/epub+zip",
    });
  });

  it("rejects malformed EPUB containers", async () => {
    const invalidEpub = zipSync({ mimetype: strToU8("application/zip") });

    await expect(new EpubParserAdapter().parse(Buffer.from(invalidEpub))).rejects.toBeInstanceOf(
      InvalidDocumentException
    );
  });

  it("rejects EPUB spine entries that are not document content", async () => {
    const invalidEpub = zipSync({
      mimetype: [strToU8("application/epub+zip"), { level: 0 }],
      "META-INF/container.xml": strToU8(
        '<container><rootfiles><rootfile full-path="content.opf"/></rootfiles></container>'
      ),
      "content.opf": strToU8(
        '<package><metadata/><manifest><item id="image" href="cover.jpg" media-type="image/jpeg"/></manifest>' +
          '<spine><itemref idref="image"/></spine></package>'
      ),
      "cover.jpg": strToU8("not image data"),
    });

    await expect(new EpubParserAdapter().parse(Buffer.from(invalidEpub))).rejects.toBeInstanceOf(
      InvalidDocumentException
    );
  });
});
