import { describe, it, expect, beforeAll } from "vitest";
import {
  initializeConfig,
  getConfig,
  ConfigService,
  ConfigurationValidationError,
} from "./index.js";

describe("Config Module", () => {
  beforeAll(() => {
    process.env.NODE_ENV = "test";
    process.env.PORT = "3000";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/rishi_ai";
    process.env.PRIMARY_AI_PROVIDER = "gemini";
    process.env.AES_MASTER_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.JWT_PRIVATE_KEY = "mock-private-key";
    process.env.JWT_PUBLIC_KEY = "mock-public-key";
  });

  it("should successfully parse and validate a correct environment config", () => {
    const validEnv = {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_ai",
      PRIMARY_AI_PROVIDER: "gemini",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "debug",
      JWT_PRIVATE_KEY: "mock-private-key",
      JWT_PUBLIC_KEY: "mock-public-key",
    };
    const parsed = initializeConfig(validEnv);
    expect(parsed.PORT).toBe(3000);
    expect(parsed.NODE_ENV).toBe("test");
    expect(parsed.LOG_LEVEL).toBe("debug");
    expect(parsed.STORAGE_PROVIDER).toBe("local");
    expect(parsed.STORAGE_LOCAL_BASE_DIR).toBe("storage");
    expect(parsed.EMAIL_PROVIDER).toBe("disabled");
    expect(parsed.GOOGLE_OAUTH_ENABLED).toBe(false);
  });

  it("should require production email delivery configuration", () => {
    expect(
      () =>
        new ConfigService({
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_ai",
          AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          JWT_PRIVATE_KEY: "mock-private-key",
          JWT_PUBLIC_KEY: "mock-public-key",
        })
    ).toThrow(ConfigurationValidationError);
  });

  it("should require complete Google OAuth configuration when enabled", () => {
    expect(
      () =>
        new ConfigService({
          NODE_ENV: "test",
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_ai",
          AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          JWT_PRIVATE_KEY: "mock-private-key",
          JWT_PUBLIC_KEY: "mock-public-key",
          GOOGLE_OAUTH_ENABLED: "true",
        })
    ).toThrow(ConfigurationValidationError);
  });

  it("should throw ConfigurationValidationError on invalid env variables", () => {
    const invalidEnv = {
      NODE_ENV: "production",
      PORT: "not-a-number",
      DATABASE_URL: "invalid-url",
      PRIMARY_AI_PROVIDER: "gemini",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "debug",
      JWT_PRIVATE_KEY: "mock-private-key",
      JWT_PUBLIC_KEY: "mock-public-key",
    };
    expect(() => initializeConfig(invalidEnv)).toThrow(ConfigurationValidationError);
  });

  it("should enforce immutability of the config object", () => {
    const config = getConfig();
    expect(() => {
      (config as any).PORT = 4000;
    }).toThrow();
  });

  it("should be idempotent and throw on conflicting config re-initialization", () => {
    const validEnv = {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_ai",
      PRIMARY_AI_PROVIDER: "gemini",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "debug",
      JWT_PRIVATE_KEY: "mock-private-key",
      JWT_PUBLIC_KEY: "mock-public-key",
    };
    // Should safely return the same config
    const first = initializeConfig(validEnv);
    const second = initializeConfig(validEnv);
    expect(first).toBe(second);

    // Conflicting initialization
    const conflictingEnv = {
      NODE_ENV: "test",
      PORT: "4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_ai",
      PRIMARY_AI_PROVIDER: "gemini",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "debug",
      JWT_PRIVATE_KEY: "mock-private-key",
      JWT_PUBLIC_KEY: "mock-public-key",
    };
    expect(() => initializeConfig(conflictingEnv)).toThrow(
      /Configuration has already been initialized/
    );
  });

  it("should support custom environments for ConfigService test isolation", () => {
    const customEnv = {
      NODE_ENV: "development",
      PORT: "5000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_custom",
      PRIMARY_AI_PROVIDER: "gemini",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "info",
      JWT_PRIVATE_KEY: "mock-private-key",
      JWT_PUBLIC_KEY: "mock-public-key",
      STORAGE_PROVIDER: "local",
      STORAGE_LOCAL_BASE_DIR: "tmp/storage-test",
    };
    const configService = new ConfigService(customEnv);
    expect(configService.get("PORT")).toBe(5000);
    expect(configService.get("DATABASE_URL")).toBe(
      "postgresql://postgres:postgres@localhost:5432/rishi_custom"
    );
    expect(configService.get("STORAGE_LOCAL_BASE_DIR")).toBe("tmp/storage-test");
  });
});
