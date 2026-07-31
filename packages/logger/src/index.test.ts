import { describe, it, expect, vi } from "vitest";
import { LoggerFactory } from "./index.js";
import type { EnvConfig } from "@rishi/config";

describe("Logger Module", () => {
  const mockConfig: EnvConfig = {
    NODE_ENV: "test",
    PORT: 3000,
    DATABASE_URL: "postgresql://localhost:5432/test",
    PRIMARY_AI_PROVIDER: "gemini",
    AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    LOG_LEVEL: "debug",
    ENABLE_SWAGGER: false,
    ALLOWED_ORIGINS: "*",
    RATE_LIMIT_MAX: 100,
    BODY_LIMIT_BYTES: 1048576,
    JWT_PRIVATE_KEY: "mock-private",
    JWT_PUBLIC_KEY: "mock-public",
    STORAGE_PROVIDER: "local",
    STORAGE_LOCAL_BASE_DIR: "storage",
    QUEUE_CONCURRENCY: 5,
    QUEUE_POLL_INTERVAL_MS: 2_000,
    QUEUE_MAX_ATTEMPTS: 25,
    QUEUE_SHUTDOWN_TIMEOUT_MS: 15_000,
    EMAIL_PROVIDER: "disabled",
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    GOOGLE_OAUTH_ENABLED: false,
    AUTH_SUCCESS_REDIRECT_URL: "http://localhost:5173/auth/callback",
    AUTH_FAILURE_REDIRECT_URL: "http://localhost:5173/login?error=oauth_failed",
  };

  it("should output correlation ID when provider returns it", () => {
    const mockCorrelationId = "tx-12345";
    const provider = () => mockCorrelationId;

    const logger = LoggerFactory.createLogger(mockConfig, provider);
    const pinoInstance = (logger as any).pinoInstance;
    const spy = vi.spyOn(pinoInstance, "info");

    logger.info("Test message", { extra: "data" });

    expect(spy).toHaveBeenCalledWith({ correlationId: "tx-12345", extra: "data" }, "Test message");
  });

  it("should omit correlation ID when provider returns undefined", () => {
    const provider = () => undefined;

    const logger = LoggerFactory.createLogger(mockConfig, provider);
    const pinoInstance = (logger as any).pinoInstance;
    const spy = vi.spyOn(pinoInstance, "info");

    logger.info("Test message 2");

    expect(spy).toHaveBeenCalledWith({}, "Test message 2");
  });

  it("should handle error context and format stack traces", () => {
    const logger = LoggerFactory.createLogger(mockConfig);
    const pinoInstance = (logger as any).pinoInstance;
    const spy = vi.spyOn(pinoInstance, "error");

    const testError = new Error("Something failed");
    logger.error("Error occurred", testError);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.objectContaining({
          message: "Something failed",
          name: "Error",
          stack: expect.any(String),
        }),
      }),
      "Error occurred"
    );
  });
});
