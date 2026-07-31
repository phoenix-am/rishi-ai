import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import path from "node:path";
import type { IFileStorageProvider } from "./file-storage.provider.js";
import {
  FileDeleteException,
  FileNotFoundException,
  FileReadException,
  FileWriteException,
  InvalidStoragePathException,
  StorageException,
} from "./storage.errors.js";

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

const invalidPortableSegmentCharacters = /[<>:"|?*]/u;
const reservedWindowsNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/iu;

/**
 * Local filesystem implementation of the binary storage contract.
 */
export class LocalStorageAdapter implements IFileStorageProvider {
  private readonly baseDirectory: string;

  constructor(configuredBaseDirectory: string, workingDirectory = process.cwd()) {
    if (!configuredBaseDirectory.trim()) {
      throw new InvalidStoragePathException(configuredBaseDirectory);
    }
    this.baseDirectory = path.resolve(workingDirectory, configuredBaseDirectory);
  }

  public async saveFile(fileBuffer: Buffer, storagePath: string): Promise<string> {
    const normalizedPath = this.normalizeStoragePath(storagePath);
    if (!Buffer.isBuffer(fileBuffer)) {
      throw new FileWriteException(normalizedPath, new TypeError("Expected a Buffer."));
    }

    let temporaryPath: string | undefined;
    try {
      const { realBaseDirectory, fullPath } = await this.resolveBaseAndPath(normalizedPath);
      const parentDirectory = path.dirname(fullPath);
      await mkdir(parentDirectory, { recursive: true });
      const realParentDirectory = await realpath(parentDirectory);
      this.assertContained(realBaseDirectory, realParentDirectory, normalizedPath);

      temporaryPath = path.join(
        realParentDirectory,
        `.${path.basename(fullPath)}.${randomUUID()}.tmp`
      );
      const fileHandle = await open(temporaryPath, "wx", 0o600);
      try {
        await fileHandle.writeFile(fileBuffer);
        await fileHandle.sync();
      } finally {
        await fileHandle.close();
      }

      await rename(temporaryPath, path.join(realParentDirectory, path.basename(fullPath)));
      temporaryPath = undefined;
      return normalizedPath;
    } catch (error) {
      if (temporaryPath) {
        await unlink(temporaryPath).catch(() => undefined);
      }
      if (error instanceof StorageException) {
        throw error;
      }
      throw new FileWriteException(normalizedPath, error);
    }
  }

  public async getFile(storagePath: string): Promise<Buffer> {
    const normalizedPath = this.normalizeStoragePath(storagePath);
    try {
      const { realBaseDirectory, fullPath } = await this.resolveBaseAndPath(normalizedPath);
      const targetStat = await lstat(fullPath);
      if (targetStat.isSymbolicLink()) {
        throw new InvalidStoragePathException(normalizedPath);
      }
      const realFilePath = await realpath(fullPath);
      this.assertContained(realBaseDirectory, realFilePath, normalizedPath);
      return await readFile(realFilePath);
    } catch (error) {
      if (error instanceof StorageException) {
        throw error;
      }
      if (isNodeError(error) && error.code === "ENOENT") {
        throw new FileNotFoundException(normalizedPath, error);
      }
      throw new FileReadException(normalizedPath, error);
    }
  }

  public async deleteFile(storagePath: string): Promise<void> {
    const normalizedPath = this.normalizeStoragePath(storagePath);
    try {
      const { realBaseDirectory, fullPath } = await this.resolveBaseAndPath(normalizedPath);
      const targetStat = await lstat(fullPath);
      if (targetStat.isSymbolicLink()) {
        throw new InvalidStoragePathException(normalizedPath);
      }
      const realFilePath = await realpath(fullPath);
      this.assertContained(realBaseDirectory, realFilePath, normalizedPath);
      await unlink(realFilePath);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return;
      }
      if (error instanceof StorageException) {
        throw error;
      }
      throw new FileDeleteException(normalizedPath, error);
    }
  }

  private normalizeStoragePath(storagePath: string): string {
    if (typeof storagePath !== "string" || !storagePath || storagePath.includes("\0")) {
      throw new InvalidStoragePathException(storagePath);
    }

    const portablePath = storagePath.replaceAll("\\", "/");
    if (path.posix.isAbsolute(portablePath) || path.win32.isAbsolute(storagePath)) {
      throw new InvalidStoragePathException(storagePath);
    }

    const segments = portablePath.split("/");
    if (
      segments.some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          segment !== segment.trim() ||
          segment.endsWith(".") ||
          invalidPortableSegmentCharacters.test(segment) ||
          [...segment].some((character) => character.charCodeAt(0) < 32) ||
          reservedWindowsNames.test(segment)
      )
    ) {
      throw new InvalidStoragePathException(storagePath);
    }

    return segments.join("/");
  }

  private async resolveBaseAndPath(
    normalizedPath: string
  ): Promise<{ realBaseDirectory: string; fullPath: string }> {
    await mkdir(this.baseDirectory, { recursive: true });
    const realBaseDirectory = await realpath(this.baseDirectory);
    const fullPath = path.resolve(realBaseDirectory, ...normalizedPath.split("/"));
    this.assertContained(realBaseDirectory, fullPath, normalizedPath);
    return { realBaseDirectory, fullPath };
  }

  private assertContained(
    realBaseDirectory: string,
    candidatePath: string,
    storagePath: string
  ): void {
    const relativePath = path.relative(realBaseDirectory, candidatePath);
    if (
      !relativePath ||
      relativePath === ".." ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      throw new InvalidStoragePathException(storagePath);
    }
  }
}
