import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import { FILE_STORAGE_PROVIDER, type IFileStorageProvider } from "./file-storage.provider.js";
import { LocalStorageAdapter } from "./local-storage.adapter.js";
import { StorageService } from "./storage.service.js";

export function createStorageProvider(config: ConfigService): IFileStorageProvider {
  const provider = config.get("STORAGE_PROVIDER");
  if (provider !== "local") {
    throw new Error(`Unsupported storage provider: ${String(provider)}`);
  }
  return new LocalStorageAdapter(config.get("STORAGE_LOCAL_BASE_DIR"));
}

/** Global Nest module exposing the configured provider and storage facade. */
@Global()
@Module({
  providers: [
    {
      provide: FILE_STORAGE_PROVIDER,
      useFactory: createStorageProvider,
      inject: [ConfigService],
    },
    StorageService,
  ],
  exports: [FILE_STORAGE_PROVIDER, StorageService],
})
export class StorageModule {}
