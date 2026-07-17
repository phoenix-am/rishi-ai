import { describe, it, expect } from "vitest";
import {
  initializeConfig,
  getConfig,
  ConfigService,
  ConfigurationValidationError,
} from "./index.js";

describe("Config Module", () => {
  it("should successfully parse and validate a correct environment config", () => {
    const validEnv = {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_ai",
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
      LOG_LEVEL: "info",
    };
    const configService = new ConfigService(customEnv);
    expect(configService.get("PORT")).toBe(5000);
    expect(configService.get("DATABASE_URL")).toBe(
      "postgresql://postgres:postgres@localhost:5432/rishi_custom"
    );
  });
});
