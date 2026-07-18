import { HttpException, HttpStatus } from "@nestjs/common";
import { BaseAppException } from "@rishi/shared";
import { OptimisticLockingException } from "@rishi/database";
import { RequestContext } from "../context/request.context.js";

export interface ErrorResponseDto {
  success: false;
  data: null;
  meta: {
    correlationId?: string;
  };
  error: {
    code: string;
    message: string;
    details: any;
  };
}

/**
 * Pure factory class responsible for mapping system, domain, and framework exceptions
 * into standardized JSON error envelopes.
 */
export class ErrorResponseFactory {
  /**
   * Translates any thrown exception into a standardized ErrorResponseDto.
   *
   * @param exception - The caught error instance.
   * @returns An object containing the response payload and the appropriate HTTP status code.
   */
  public static createResponse(exception: unknown): {
    payload: ErrorResponseDto;
    statusCode: number;
  } {
    const correlationId = RequestContext.getCorrelationId();
    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred. Please contact support.";
    let details: any = null;
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof BaseAppException) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = (exception as any).errors || (exception as any).metadata || null;
    } else if (exception instanceof OptimisticLockingException) {
      statusCode = HttpStatus.CONFLICT;
      code = "OPTIMISTIC_LOCK_CONFLICT";
      message = "The resource was modified by another request. Please reload and try again.";
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === "string") {
        message = response;
      } else if (typeof response === "object" && response !== null) {
        message = (response as any).message || exception.message;
        details = (response as any).error || response;
      }

      code = this.mapHttpStatusToCode(statusCode);
    } else if (exception instanceof Error) {
      // In development/test, it can be useful to see the message, but in production we hide details
      const isProduction = process.env.NODE_ENV === "production";
      message = isProduction
        ? "An unexpected error occurred. Please contact support."
        : exception.message;
    }

    const payload: ErrorResponseDto = {
      success: false,
      data: null,
      meta: {
        correlationId,
      },
      error: {
        code,
        message,
        details,
      },
    };

    return { payload, statusCode };
  }

  /**
   * Helper to map standard HTTP status codes to machine-readable string codes.
   */
  private static mapHttpStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.METHOD_NOT_ALLOWED:
        return "METHOD_NOT_ALLOWED";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "TOO_MANY_REQUESTS";
      case HttpStatus.SERVICE_UNAVAILABLE:
        return "SERVICE_UNAVAILABLE";
      case HttpStatus.GATEWAY_TIMEOUT:
        return "GATEWAY_TIMEOUT";
      default:
        return "HTTP_ERROR";
    }
  }
}
