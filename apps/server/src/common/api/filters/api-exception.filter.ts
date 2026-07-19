import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { BaseAppException } from "@rishi/shared";
import { OptimisticLockingException } from "@rishi/database";
import type { ILogger } from "@rishi/logger";
import { RequestContext } from "../../../foundation/context/request.context.js";

/**
 * Unified JSON error envelope shape returned by `ApiExceptionFilter`.
 *
 * Matches the inverse of `ApiResponseDto` — `success` is always `false` and
 * `data` is always `null` so clients can discriminate errors by a single field.
 */
export interface ApiErrorResponseDto {
  success: false;
  data: null;
  meta: {
    correlationId?: string;
  };
  error: {
    /** Machine-readable error code (e.g. `BAD_REQUEST`, `DOMAIN_NOT_FOUND`). */
    code: string;
    /** Human-readable message safe to surface to end-users. */
    message: string;
    /** Optional array of validation errors or domain-specific metadata. */
    details: unknown;
  };
}

/**
 * Application-layer exception filter for the `common/api` layer.
 *
 * Catches every unhandled exception thrown during a request and maps it to the
 * unified `ApiErrorResponseDto` envelope. Handles three exception families in
 * priority order:
 *
 * 1. **`BaseAppException`** (domain exceptions from Phase 3) — preserves the
 *    custom status code and machine-readable `code` defined on each exception.
 * 2. **`OptimisticLockingException`** — mapped to HTTP 409 Conflict.
 * 3. **NestJS `HttpException`** — standard framework HTTP errors.
 * 4. **All other `Error` subclasses** — 500 Internal Server Error (message
 *    hidden in production to prevent information leakage).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse(); // Fastify Reply
    const request = ctx.getRequest(); // Fastify Request

    const { payload, statusCode } = this.buildResponse(exception);

    const message = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(
      `[ApiExceptionFilter] ${request.method} ${request.url} → ${statusCode}: ${message}`,
      {
        method: request.method,
        url: request.url,
        statusCode,
        err: exception instanceof Error ? exception : new Error(String(exception)),
      }
    );

    response.status(statusCode).send(payload);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Maps any thrown value to a structured `{ payload, statusCode }` tuple.
   */
  private buildResponse(exception: unknown): {
    payload: ApiErrorResponseDto;
    statusCode: number;
  } {
    const correlationId = RequestContext.getCorrelationId();

    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred. Please contact support.";
    let details: unknown = null;
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof BaseAppException) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = (exception as any).errors ?? (exception as any).metadata ?? null;
    } else if (exception instanceof OptimisticLockingException) {
      statusCode = HttpStatus.CONFLICT;
      code = "OPTIMISTIC_LOCK_CONFLICT";
      message = "The resource was modified by another request. Please reload and try again.";
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const resp = exception.getResponse();

      if (typeof resp === "string") {
        message = resp;
      } else if (typeof resp === "object" && resp !== null) {
        message = (resp as any).message ?? exception.message;
        details = (resp as any).error ?? resp;
      }

      code = ApiExceptionFilter.httpStatusToCode(statusCode);
    } else if (exception instanceof Error) {
      const isProduction = process.env["NODE_ENV"] === "production";
      message = isProduction
        ? "An unexpected error occurred. Please contact support."
        : exception.message;
    }

    const payload: ApiErrorResponseDto = {
      success: false,
      data: null,
      meta: { correlationId },
      error: { code, message, details },
    };

    return { payload, statusCode };
  }

  /**
   * Converts standard HTTP status codes to machine-readable string codes used
   * in the `error.code` field.
   */
  static httpStatusToCode(status: number): string {
    const map: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
      [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
      [HttpStatus.FORBIDDEN]: "FORBIDDEN",
      [HttpStatus.NOT_FOUND]: "NOT_FOUND",
      [HttpStatus.METHOD_NOT_ALLOWED]: "METHOD_NOT_ALLOWED",
      [HttpStatus.CONFLICT]: "CONFLICT",
      [HttpStatus.UNPROCESSABLE_ENTITY]: "UNPROCESSABLE_ENTITY",
      [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
      [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_SERVER_ERROR",
      [HttpStatus.SERVICE_UNAVAILABLE]: "SERVICE_UNAVAILABLE",
      [HttpStatus.GATEWAY_TIMEOUT]: "GATEWAY_TIMEOUT",
    };
    return map[status] ?? "HTTP_ERROR";
  }
}
