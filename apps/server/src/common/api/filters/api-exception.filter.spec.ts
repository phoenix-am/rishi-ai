import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { ApiExceptionFilter } from "./api-exception.filter.js";
import { BaseAppException } from "@rishi/shared";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function buildHost(requestOverrides: Record<string, unknown> = {}): ArgumentsHost {
  const request = { method: "GET", url: "/api/v1/test", ...requestOverrides };
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply,
    }),
  } as unknown as ArgumentsHost;
}

function buildFilter() {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  const filter = new ApiExceptionFilter(logger);
  return { filter, logger };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ApiExceptionFilter", () => {
  beforeEach(() => {
    process.env["NODE_ENV"] = "test";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("BaseAppException (Domain exceptions)", () => {
    it("should use the exception code and statusCode directly", () => {
      const { filter } = buildFilter();
      const host = buildHost();
      const reply = host.switchToHttp().getResponse() as any;

      const domainError = new BaseAppException("Creator not found", "CREATOR_NOT_FOUND", 404);
      filter.catch(domainError, host);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          data: null,
          error: expect.objectContaining({
            code: "CREATOR_NOT_FOUND",
            message: "Creator not found",
          }),
        })
      );
    });
  });

  describe("NestJS HttpException", () => {
    it("should map HttpException to correct status and BAD_REQUEST code", () => {
      const { filter } = buildFilter();
      const host = buildHost();
      const reply = host.switchToHttp().getResponse() as any;

      filter.catch(new HttpException("Bad input", HttpStatus.BAD_REQUEST), host);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "BAD_REQUEST",
            message: "Bad input",
          }),
        })
      );
    });

    it("should extract message from object response shape", () => {
      const { filter } = buildFilter();
      const host = buildHost();
      const reply = host.switchToHttp().getResponse() as any;

      filter.catch(
        new HttpException(
          { message: "Validation failed", error: "Bad Request" },
          HttpStatus.BAD_REQUEST
        ),
        host
      );

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: "Validation failed" }),
        })
      );
    });

    it("should map 401 to UNAUTHORIZED code", () => {
      const { filter } = buildFilter();
      const host = buildHost();
      const reply = host.switchToHttp().getResponse() as any;

      filter.catch(new HttpException("Not authenticated", HttpStatus.UNAUTHORIZED), host);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "UNAUTHORIZED" }),
        })
      );
    });

    it("should map 429 to TOO_MANY_REQUESTS code", () => {
      const { filter } = buildFilter();
      const host = buildHost();
      const reply = host.switchToHttp().getResponse() as any;

      filter.catch(new HttpException("Slow down", HttpStatus.TOO_MANY_REQUESTS), host);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "TOO_MANY_REQUESTS" }),
        })
      );
    });
  });

  describe("Generic Error (unhandled)", () => {
    it("should return 500 INTERNAL_SERVER_ERROR and expose message in non-production", () => {
      process.env["NODE_ENV"] = "test";
      const { filter } = buildFilter();
      const host = buildHost();
      const reply = host.switchToHttp().getResponse() as any;

      filter.catch(new Error("DB timeout"), host);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "INTERNAL_SERVER_ERROR",
            message: "DB timeout",
          }),
        })
      );
    });

    it("should hide real message in production mode", () => {
      process.env["NODE_ENV"] = "production";
      const { filter } = buildFilter();
      const host = buildHost();
      const reply = host.switchToHttp().getResponse() as any;

      filter.catch(new Error("Secret DB password"), host);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: "An unexpected error occurred. Please contact support.",
          }),
        })
      );
    });
  });

  describe("Non-Error thrown values", () => {
    it("should handle plain string throws gracefully", () => {
      const { filter } = buildFilter();
      const host = buildHost();
      const reply = host.switchToHttp().getResponse() as any;

      filter.catch("Something exploded", host);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, data: null })
      );
    });
  });

  describe("Logging", () => {
    it("should invoke logger.error once per exception", () => {
      const { filter, logger } = buildFilter();
      const host = buildHost();

      filter.catch(new Error("Boom"), host);

      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("httpStatusToCode (static helper)", () => {
    it.each([
      [400, "BAD_REQUEST"],
      [401, "UNAUTHORIZED"],
      [403, "FORBIDDEN"],
      [404, "NOT_FOUND"],
      [405, "METHOD_NOT_ALLOWED"],
      [409, "CONFLICT"],
      [422, "UNPROCESSABLE_ENTITY"],
      [429, "TOO_MANY_REQUESTS"],
      [500, "INTERNAL_SERVER_ERROR"],
      [503, "SERVICE_UNAVAILABLE"],
      [504, "GATEWAY_TIMEOUT"],
      [418, "HTTP_ERROR"], // unmapped → fallback
    ] as const)("should map status %i to code %s", (status, expectedCode) => {
      expect(ApiExceptionFilter.httpStatusToCode(status)).toBe(expectedCode);
    });
  });
});
