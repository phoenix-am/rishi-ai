import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FileDeleteException,
  FileNotFoundException,
  FileReadException,
  FileWriteException,
  InvalidStoragePathException,
} from "./storage.errors.js";

const fsMocks = vi.hoisted(() => ({
  lstat: vi.fn(),
  mkdir: vi.fn(),
  open: vi.fn(),
  readFile: vi.fn(),
  realpath: vi.fn(),
  rename: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("node:fs/promises", () => fsMocks);

import { LocalStorageAdapter } from "./local-storage.adapter.js";

function nodeError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

describe("LocalStorageAdapter unit behavior", () => {
  const baseDirectory = path.resolve("storage-unit-test");
  const fileHandle = {
    writeFile: vi.fn(),
    sync: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fsMocks.mkdir.mockResolvedValue(undefined);
    fsMocks.realpath.mockImplementation(async (value: string) => value);
    fsMocks.open.mockResolvedValue(fileHandle);
    fsMocks.rename.mockResolvedValue(undefined);
    fsMocks.unlink.mockResolvedValue(undefined);
    fileHandle.writeFile.mockResolvedValue(undefined);
    fileHandle.sync.mockResolvedValue(undefined);
    fileHandle.close.mockResolvedValue(undefined);
  });

  it("writes through a temporary file and returns the normalized relative path", async () => {
    const adapter = new LocalStorageAdapter(baseDirectory);
    const content = Buffer.from("binary payload");

    await expect(adapter.saveFile(content, "uploads\\asset.bin")).resolves.toBe(
      "uploads/asset.bin"
    );

    expect(fsMocks.mkdir).toHaveBeenCalledWith(baseDirectory, { recursive: true });
    expect(fileHandle.writeFile).toHaveBeenCalledWith(content);
    expect(fileHandle.sync).toHaveBeenCalledOnce();
    expect(fileHandle.close).toHaveBeenCalledOnce();
    expect(fsMocks.rename).toHaveBeenCalledWith(
      expect.stringMatching(/\.asset\.bin\..+\.tmp$/),
      path.join(baseDirectory, "uploads", "asset.bin")
    );
  });

  it("removes a temporary object and throws FileWriteException after a failed write", async () => {
    const adapter = new LocalStorageAdapter(baseDirectory);
    fileHandle.writeFile.mockRejectedValueOnce(nodeError("ENOSPC"));

    await expect(
      adapter.saveFile(Buffer.from("data"), "uploads/failure.bin")
    ).rejects.toBeInstanceOf(FileWriteException);
    expect(fileHandle.close).toHaveBeenCalledOnce();
    expect(fsMocks.unlink).toHaveBeenCalledWith(expect.stringMatching(/\.failure\.bin\..+\.tmp$/));
    expect(fsMocks.rename).not.toHaveBeenCalled();
  });

  it("maps a missing read to FileNotFoundException", async () => {
    const adapter = new LocalStorageAdapter(baseDirectory);
    fsMocks.lstat.mockRejectedValueOnce(nodeError("ENOENT"));

    await expect(adapter.getFile("uploads/missing.bin")).rejects.toBeInstanceOf(
      FileNotFoundException
    );
  });

  it("maps provider read and delete failures to stable exceptions", async () => {
    const adapter = new LocalStorageAdapter(baseDirectory);
    fsMocks.lstat.mockResolvedValue({ isSymbolicLink: () => false });
    fsMocks.readFile.mockRejectedValueOnce(nodeError("EACCES"));

    await expect(adapter.getFile("uploads/private.bin")).rejects.toBeInstanceOf(FileReadException);

    fsMocks.unlink.mockRejectedValueOnce(nodeError("EACCES"));
    await expect(adapter.deleteFile("uploads/private.bin")).rejects.toBeInstanceOf(
      FileDeleteException
    );
  });

  it("rejects symbolic-link objects", async () => {
    const adapter = new LocalStorageAdapter(baseDirectory);
    fsMocks.lstat.mockResolvedValue({ isSymbolicLink: () => true });

    await expect(adapter.getFile("uploads/link.bin")).rejects.toBeInstanceOf(
      InvalidStoragePathException
    );
    await expect(adapter.deleteFile("uploads/link.bin")).rejects.toBeInstanceOf(
      InvalidStoragePathException
    );
  });

  it("treats deletion of an absent object as idempotent success", async () => {
    const adapter = new LocalStorageAdapter(baseDirectory);
    fsMocks.lstat.mockRejectedValueOnce(nodeError("ENOENT"));

    await expect(adapter.deleteFile("uploads/missing.bin")).resolves.toBeUndefined();
    expect(fsMocks.unlink).not.toHaveBeenCalled();
  });
});
