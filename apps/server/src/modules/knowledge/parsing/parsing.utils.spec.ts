import { describe, expect, it } from "vitest";
import { strToU8, zipSync, type Zippable } from "fflate";
import { InvalidDocumentException } from "./parsing.errors.js";
import { unzipDocumentArchive } from "./parsing.utils.js";

describe("unzipDocumentArchive", () => {
  it("rejects archives with an excessive entry count before extraction", () => {
    const entries: Zippable = {};
    for (let index = 0; index <= 4_096; index += 1) {
      entries[`entry-${index}.txt`] = strToU8("");
    }
    const archive = zipSync(entries);

    expect(() => unzipDocumentArchive(Buffer.from(archive))).toThrow(InvalidDocumentException);
  });
});
