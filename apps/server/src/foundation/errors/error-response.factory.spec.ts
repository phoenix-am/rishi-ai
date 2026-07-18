import { describe, it, expect, afterEach } from "vitest";
import { HttpStatus, BadRequestException } from "@nestjs/common";
import { BaseAppException } from "@rishi/shared";
import { OptimisticLockingException } from "@rishi/database";
import { ErrorResponseFactory } from "./error-response.factory.js";
import { RequestContext } from "../context/request.context.js";

describe("ErrorResponseFactory", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("should format custom BaseAppException into the standardized response envelope", () => {
    const error = new BaseAppException(
      "Insufficient permissions",
      "FORBIDDEN_OPERATION",
      HttpStatus.FORBIDDEN
    );
    const { payload, statusCode } = ErrorResponseFactory.createResponse(error);

    expect(statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(payload.success).toBe(false);
    expect(payload.data).toBeNull();
    expect(payload.error.code).toBe("FORBIDDEN_OPERATION");
    expect(payload.error.message).toBe("Insufficient permissions");
    expect(payload.error.details).toBeNull();
  });

  it("should map OptimisticLockingException to 409 Conflict with generic message", () => {
    const error = new OptimisticLockingException("project-id-123", 1, 2);
    const { payload, statusCode } = ErrorResponseFactory.createResponse(error);

    expect(statusCode).toBe(HttpStatus.CONFLICT);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("OPTIMISTIC_LOCK_CONFLICT");
    expect(payload.error.message).toContain("modified by another request");
    expect(payload.error.details).toBeNull();
  });

  it("should map NestJS HttpException to appropriate HTTP status and mapped code", () => {
    const error = new BadRequestException("Name cannot be empty");
    const { payload, statusCode } = ErrorResponseFactory.createResponse(error);

    expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("BAD_REQUEST");
    expect(payload.error.message).toBe("Name cannot be empty");
  });

  it("should mask raw system Error messages in production environment to prevent data leaks", () => {
    process.env.NODE_ENV = "production";
    const error = new Error("db connection timeout: pg://admin:secret@host:5432");
    const { payload, statusCode } = ErrorResponseFactory.createResponse(error);

    expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(payload.error.message).toBe("An unexpected error occurred. Please contact support.");
    expect(payload.error.details).toBeNull();
  });

  it("should leak raw system Error messages in development or test environment for easy debugging", () => {
    process.env.NODE_ENV = "test";
    const error = new Error("local schema parsing failure");
    const { payload, statusCode } = ErrorResponseFactory.createResponse(error);

    expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(payload.error.message).toBe("local schema parsing failure");
  });

  it("should include correlationId inside error response meta if request context is active", () => {
    RequestContext.run({ correlationId: "trace-999" }, () => {
      const error = new Error("fatal query error");
      const { payload } = ErrorResponseFactory.createResponse(error);
      expect(payload.meta.correlationId).toBe("trace-999");
    });
  });
});
