import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import type { ILogger } from "@rishi/logger";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : "Internal server error";

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled exception at [${request.method}] ${request.url}: ${message}`,
        exception as Error
      );
    }

    // Format unhandled errors into a standardized JSON response
    response.status(statusCode).send({
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
