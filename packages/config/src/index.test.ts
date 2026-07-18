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
  });

  it("should successfully parse and validate a correct environment config", () => {
    const validEnv = {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_ai",
      PRIMARY_AI_PROVIDER: "gemini",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "debug",
    };
    const parsed = initializeConfig(validEnv);
    expect(parsed.PORT).toBe(3000);
    expect(parsed.NODE_ENV).toBe("test");
    expect(parsed.LOG_LEVEL).toBe("debug");
  });

  it("should throw ConfigurationValidationError on invalid env variables", () => {
    const invalidEnv = {
      NODE_ENV: "production",
      PORT: "not-a-number",
      DATABASE_URL: "invalid-url",
      PRIMARY_AI_PROVIDER: "gemini",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "debug",
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
    };
    const configService = new ConfigService(customEnv);
    expect(configService.get("PORT")).toBe(5000);
    expect(configService.get("DATABASE_URL")).toBe(
      "postgresql://postgres:postgres@localhost:5432/rishi_custom"
    );
  });
});
