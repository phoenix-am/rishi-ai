import { describe, expect, it, vi } from "vitest";
import { ConfigService } from "@rishi/config";
import type { IFileStorageProvider } from "./file-storage.provider.js";
import {
  FILE_STORAGE_PROVIDER,
  LocalStorageAdapter,
  StorageModule,
  StorageService,
  createStorageProvider,
} from "./index.js";

describe("Storage public API", () => {
  it("delegates binary operations through StorageService", async () => {
    const provider: IFileStorageProvider = {
      saveFile: vi.fn().mockResolvedValue("objects/test.bin"),
      getFile: vi.fn().mockResolvedValue(Buffer.from([1, 2, 3])),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };
    const service = new StorageService(provider);
    const content = Buffer.from([1, 2, 3]);

    await expect(service.saveFile(content, "objects/test.bin")).resolves.toBe("objects/test.bin");
    await expect(service.getFile("objects/test.bin")).resolves.toEqual(content);
    await expect(service.deleteFile("objects/test.bin")).resolves.toBeUndefined();
    expect(provider.saveFile).toHaveBeenCalledWith(content, "objects/test.bin");
  });

  it("exports the provider token, adapter, factory, and Nest module", () => {
    expect(FILE_STORAGE_PROVIDER).toBeTypeOf("symbol");
    expect(LocalStorageAdapter).toBeTypeOf("function");
    expect(createStorageProvider).toBeTypeOf("function");
    expect(StorageModule).toBeTypeOf("function");
  });

  it("creates the configured local provider", () => {
    const config = new ConfigService({
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_ai",
      PRIMARY_AI_PROVIDER: "gemini",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "error",
      JWT_PRIVATE_KEY: "test-private-key",
      JWT_PUBLIC_KEY: "test-public-key",
      STORAGE_PROVIDER: "local",
      STORAGE_LOCAL_BASE_DIR: "storage-test",
    });

    expect(createStorageProvider(config)).toBeInstanceOf(LocalStorageAdapter);
  });
});
