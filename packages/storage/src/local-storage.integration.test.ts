import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStorageAdapter } from "./local-storage.adapter.js";
import { FileNotFoundException, InvalidStoragePathException } from "./storage.errors.js";
import { StorageService } from "./storage.service.js";

describe("Local storage integration", () => {
  let baseDirectory: string;
  let service: StorageService;

  beforeEach(async () => {
    baseDirectory = await mkdtemp(path.join(tmpdir(), "rishi-storage-"));
    service = new StorageService(new LocalStorageAdapter(baseDirectory));
  });

  afterEach(async () => {
    await rm(baseDirectory, { recursive: true, force: true });
  });

  it("persists, overwrites, reads, and deletes binary objects", async () => {
    const objectPath = "uploads/workspace-1/asset.bin";
    const original = Buffer.from([0, 1, 2, 3, 255]);
    const replacement = Buffer.from([9, 8, 7]);

    await expect(service.saveFile(original, objectPath)).resolves.toBe(objectPath);
    await expect(service.getFile(objectPath)).resolves.toEqual(original);
    await expect(service.saveFile(replacement, objectPath)).resolves.toBe(objectPath);
    await expect(service.getFile(objectPath)).resolves.toEqual(replacement);
    await expect(service.deleteFile(objectPath)).resolves.toBeUndefined();
    await expect(service.deleteFile(objectPath)).resolves.toBeUndefined();
    await expect(service.getFile(objectPath)).rejects.toBeInstanceOf(FileNotFoundException);
  });

  it.each([
    "",
    "../outside.bin",
    "uploads/../outside.bin",
    "/absolute.bin",
    "C:\\outside.bin",
    "uploads/file.bin:stream",
    "uploads/CON",
    "uploads/trailing. ",
  ])("rejects unsafe object path %j", async (unsafePath) => {
    await expect(service.saveFile(Buffer.from("data"), unsafePath)).rejects.toBeInstanceOf(
      InvalidStoragePathException
    );
  });
});
