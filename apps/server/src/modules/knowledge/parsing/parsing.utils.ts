import { unzipSync, type Unzipped } from "fflate";
import { InvalidDocumentException } from "./parsing.errors.js";

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const MAX_ARCHIVE_ENTRIES = 4_096;
const MAX_EXPANDED_ARCHIVE_BYTES = 100 * 1024 * 1024;

export function decodeUtf8(fileBuffer: Buffer | Uint8Array): string {
  try {
    return UTF8_DECODER.decode(fileBuffer);
  } catch (error) {
    throw new InvalidDocumentException("Document content is not valid UTF-8.", { cause: error });
  }
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    .replace(/[\t\f\v ]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

export function countWords(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function optionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = normalizeText(value);
  return normalized || undefined;
}

export function assertNonEmptyBuffer(fileBuffer: Buffer): void {
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.byteLength === 0) {
    throw new InvalidDocumentException("Document content must be a non-empty Buffer.");
  }
}

export function hasBytes(fileBuffer: Buffer, expected: string): boolean {
  return fileBuffer.subarray(0, Buffer.byteLength(expected)).toString("latin1") === expected;
}

/** Inspects ZIP metadata before extraction to bound archive memory amplification. */
export function unzipDocumentArchive(fileBuffer: Buffer): Unzipped {
  let entryCount = 0;
  let expandedBytes = 0;
  return unzipSync(fileBuffer, {
    filter: ({ originalSize }) => {
      entryCount += 1;
      expandedBytes += originalSize;
      if (entryCount > MAX_ARCHIVE_ENTRIES || expandedBytes > MAX_EXPANDED_ARCHIVE_BYTES) {
        throw new InvalidDocumentException("Document archive exceeds safe extraction limits.");
      }
      return true;
    },
  });
}
