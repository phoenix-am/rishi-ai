export abstract class StorageException extends Error {
  public readonly storagePath: string;

  protected constructor(name: string, message: string, storagePath: string, cause?: unknown) {
    super(message, { cause });
    this.name = name;
    this.storagePath = storagePath;
  }
}

export class InvalidStoragePathException extends StorageException {
  constructor(storagePath: string, cause?: unknown) {
    super(
      "InvalidStoragePathException",
      "Storage path must be a safe, non-empty relative object path.",
      storagePath,
      cause
    );
  }
}

export class FileWriteException extends StorageException {
  constructor(storagePath: string, cause?: unknown) {
    super("FileWriteException", "The storage object could not be written.", storagePath, cause);
  }
}

export class FileNotFoundException extends StorageException {
  constructor(storagePath: string, cause?: unknown) {
    super(
      "FileNotFoundException",
      "The requested storage object does not exist.",
      storagePath,
      cause
    );
  }
}

export class FileReadException extends StorageException {
  constructor(storagePath: string, cause?: unknown) {
    super("FileReadException", "The storage object could not be read.", storagePath, cause);
  }
}

export class FileDeleteException extends StorageException {
  constructor(storagePath: string, cause?: unknown) {
    super("FileDeleteException", "The storage object could not be deleted.", storagePath, cause);
  }
}
