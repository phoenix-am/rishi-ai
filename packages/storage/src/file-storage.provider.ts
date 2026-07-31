/**
 * Vendor-independent contract for persistent binary objects.
 * All object paths are relative to the configured provider root.
 */
export interface IFileStorageProvider {
  saveFile(fileBuffer: Buffer, path: string): Promise<string>;
  getFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
}

/** Nest injection token for the active file-storage provider. */
export const FILE_STORAGE_PROVIDER = Symbol.for("@rishi/storage/IFileStorageProvider");
