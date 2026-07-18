import { describe, it, expect, vi } from "vitest";
import { ArgumentsHost, HttpStatus } from "@nestjs/common";
import { GlobalExceptionFilter } from "./exception.filter.js";

describe("GlobalExceptionFilter", () => {
  it("should catch error, invoke ILogger error logging, and send standardized error envelope via fastify reply", () => {
    const loggerMock = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const replyMock = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    const requestMock = {
      method: "GET",
      url: "/api/v1/health",
    };

    const hostMock = {
      switchToHttp: () => ({
        getRequest: () => requestMock,
        getResponse: () => replyMock,
      }),
    } as unknown as ArgumentsHost;

    const filter = new GlobalExceptionFilter(loggerMock);
    const exception = new Error("Database timeout");

    filter.catch(exception, hostMock);

    // Assert that the filter performs structured logging
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("Exception occurred during GET /api/v1/health: Database timeout"),
      expect.objectContaining({
        method: "GET",
        url: "/api/v1/health",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        err: exception,
      })
    );

    // Assert that the filter configures correct response status and payloads
    expect(replyMock.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(replyMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: null,
        error: expect.objectContaining({
          code: "INTERNAL_SERVER_ERROR",
          message: expect.stringContaining("Database timeout"),
        }),
      })
    );
  });
});
