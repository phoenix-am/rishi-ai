import { ExceptionFilter, Catch, ArgumentsHost, Inject } from "@nestjs/common";
import type { ILogger } from "@rishi/logger";
import { ErrorResponseFactory } from "../errors/error-response.factory.js";

/**
 * Global exception filter catching all route-level exceptions.
 * Logs errors with correlation context and routes formatting to the ErrorResponseFactory.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse(); // Fastify Reply object
    const request = ctx.getRequest(); // Fastify Request object

    // 1. Compile formatted payload and HTTP status code
    const { payload, statusCode } = ErrorResponseFactory.createResponse(exception);

    // 2. Perform centralized error logging
    const message = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(`Exception occurred during ${request.method} ${request.url}: ${message}`, {
      method: request.method,
      url: request.url,
      statusCode,
      err: exception instanceof Error ? exception : new Error(String(exception)),
    });

    // 3. Send formatted JSON error response envelope
    response.status(statusCode).send(payload);
  }
}
