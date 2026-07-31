import { Inject, Injectable } from "@nestjs/common";
import { FILE_STORAGE_PROVIDER, type IFileStorageProvider } from "./file-storage.provider.js";

/** Application-facing facade for the configured binary storage provider. */
@Injectable()
export class StorageService implements IFileStorageProvider {
  constructor(@Inject(FILE_STORAGE_PROVIDER) private readonly provider: IFileStorageProvider) {}

  public saveFile(fileBuffer: Buffer, path: string): Promise<string> {
    return this.provider.saveFile(fileBuffer, path);
  }

  public getFile(path: string): Promise<Buffer> {
    return this.provider.getFile(path);
  }

  public deleteFile(path: string): Promise<void> {
    return this.provider.deleteFile(path);
  }
}
